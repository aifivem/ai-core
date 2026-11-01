-- vRP 1 server API on ai-core, permissions: the panel's rules (`permissions` in data/vrp.json), else the defaults
-- (`<job>.*` on duty, `admin.*`, `player.*`), plus vRP 1.0's `!name.args` functions and `#item.op` counts; see
-- bridge/vrp/CLAUDE.md.

local core = Bridge.core
local vRP = BridgeVRP.proxy
local holdsJob, holdsGang, hasGroupOf = BridgeVRP.holdsJob, BridgeVRP.holdsGang, BridgeVRP.hasGroupOf

-- Permission rules indexed per change of the mapping: exact strings and `prefix*` rules.
---@type table<string, VrpPermissionRule[]>
local exactRules = {}
---@type { prefix: string, rule: VrpPermissionRule }[]
local prefixRules = {}

---@param config VrpConfig
local function indexRules(config)
    exactRules, prefixRules = {}, {}
    for _, rule in ipairs(config.permissions or {}) do
        local permission = rule.permission
        if permission:sub(-1) == '*' then
            prefixRules[#prefixRules + 1] = { prefix = permission:sub(1, -2), rule = rule }
        else
            local list = exactRules[permission] or {}
            list[#list + 1] = rule
            exactRules[permission] = list
        end
    end
end
indexRules(BridgeVRP.config())

---@type table<string, true>
local asked = {}

--- Records a permission string for the panel's list (once per string per runtime).
---@param permission string
local function recordAsked(permission)
    if asked[permission] then return end
    asked[permission] = true
    core:VrpPermissionAsked(permission)
end

---@param rule VrpPermissionRule
---@param mirror BridgeMirror
---@param source integer
---@return boolean
local function ruleMatches(rule, mirror, source)
    if rule.everyone then return true end
    if rule.admin and Bridge.isAdmin(source) then return true end
    if rule.job ~= '' and holdsJob(mirror, rule.job, rule.grade) and (not rule.onDuty or mirror.duty == rule.job) then return true end
    if rule.gang ~= '' and holdsGang(mirror, rule.gang, rule.grade) then return true end
    if rule.group ~= '' and hasGroupOf(mirror, source, rule.group) then return true end
    return false
end

---@param mirror BridgeMirror
---@param source integer
---@param permission string
---@return boolean
local function plainPermission(mirror, source, permission)
    recordAsked(permission)
    local named = false
    local rules = exactRules[permission]
    if rules then
        named = true
        for i = 1, #rules do
            if ruleMatches(rules[i], mirror, source) then return true end
        end
    end
    for i = 1, #prefixRules do
        local entry = prefixRules[i]
        if permission:sub(1, #entry.prefix) == entry.prefix then
            named = true
            if ruleMatches(entry.rule, mirror, source) then return true end
        end
    end
    if named then return false end
    local defaults = BridgeVRP.config().defaults or {}
    local head = permission:match('^([^.]+)%.')
    if not head then return false end
    if defaults.jobPrefix and Bridge.jobDefinitions()[head] then
        return holdsJob(mirror, head) and (not defaults.jobOnDuty or mirror.duty == head)
    end
    if head == 'admin' then return defaults.adminPrefix == true and Bridge.isAdmin(source) end
    if head == 'player' then return defaults.playerPrefix == true end
    return false
end

---@type table<string, { fn: any, owner: string }>
local permissionFunctions = {}

local permitted

--- `#item.op` (vRP 1.0 item permission: `#water.>0`, `#water.<3`, `#water.2`).
---@param userId integer
---@param permission string
---@return boolean
local function itemPermission(userId, permission)
    local parts = splitString(permission:sub(2), '.')
    if #parts ~= 2 then return false end
    local amount = vRP.getInventoryItemAmount(userId, parts[1])
    local op = parts[2]
    local first = op:sub(1, 1)
    if first == '<' then return amount < parseInt(op:sub(2)) end
    if first == '>' then return amount > parseInt(op:sub(2)) end
    return amount == parseInt(op)
end

---@param mirror BridgeMirror
---@param source integer
---@param userId integer
---@param permission string
---@return boolean
permitted = function(mirror, source, userId, permission)
    local first = permission:sub(1, 1)
    if first == '!' then
        local parts = splitString(permission:sub(2), '.')
        local name = parts[1]
        if name == 'not' then return not permitted(mirror, source, userId, '!' .. table.concat(parts, '.', 2)) end
        if name == 'is' then
            -- vRP asks the client; only possible inside a thread.
            if not coroutine.isyieldable() then return false end
            if parts[2] == 'inside' then return BridgeVRP.client.isInside(source) == true end
            if parts[2] == 'invehicle' then return BridgeVRP.client.isInVehicle(source) == true end
            return false
        end
        local entry = name and permissionFunctions[name]
        if not entry then return false end
        return BridgeVRP.call(entry.fn, userId, parts) or false
    end
    if first == '#' then return itemPermission(userId, permission) end
    if first == '@' then return false end -- aptitudes are not answered
    return plainPermission(mirror, source, permission)
end

--- Registers a `!name.args` permission function `callback(user_id, parts)`; it goes when its resource stops.
---@param name any
---@param callback any
function vRP.registerPermissionFunction(name, callback)
    if type(name) ~= 'string' or not BridgeVRP.isCallable(callback) then return end
    permissionFunctions[name] = { fn = callback, owner = BridgeVRP.caller() }
end

---@param user_id any
---@param perm any
---@return boolean
function vRP.hasPermission(user_id, perm)
    local mirror, source = BridgeVRP.mirror(user_id)
    if not mirror or type(perm) ~= 'string' or perm == '' then return false end
    ---@cast source integer
    return permitted(mirror, source, mirror.character.id, perm)
end

---@param user_id any
---@param perms any
---@return boolean
function vRP.hasPermissions(user_id, perms)
    if type(perms) ~= 'table' then return false end
    for _, perm in pairs(perms) do
        if not vRP.hasPermission(user_id, perm) then return false end
    end
    return true
end

--- user_ids of every loaded character with the permission (a scan of the loaded players).
---@param perm any
---@return integer[]
function vRP.getUsersByPermission(perm)
    local out = {}
    if type(perm) ~= 'string' or perm == '' then return out end
    for source, mirror in pairs(Bridge.players) do
        if permitted(mirror, source, mirror.character.id, perm) then out[#out + 1] = mirror.character.id end
    end
    return out
end

---@param group any
---@return integer[]
function vRP.getUsersByGroup(group)
    local out = {}
    if type(group) ~= 'string' then return out end
    for source, mirror in pairs(Bridge.players) do
        if hasGroupOf(mirror, source, group) then out[#out + 1] = mirror.character.id end
    end
    return out
end

BridgeVRP.indexRules = indexRules
BridgeVRP.permissionFunctions = permissionFunctions
