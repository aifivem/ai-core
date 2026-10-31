-- vRP 1 server API on ai-core, groups and permissions. Signatures: vRP 1.0 `vrp/modules/group.lua` (same names in
-- vRPex, Zirix, Dunko). vRP groups map onto ai-core: a job name = a job membership (any grade), a gang name = the
-- active gang, `admin` = the `ai.admin` ace, a panel alias (`groups` in data/vrp.json) = a job / gang grade or admin,
-- anything else = an "extra group" kept in character metadata `vrpGroups`. Permissions follow the panel's rules
-- (`permissions`), else the defaults (`<job>.*` on duty, `admin.*`, `player.*`); see bridge/vrp/CLAUDE.md.

local core = Bridge.core
local vRP = BridgeVRP.proxy

local META_KEY = 'vrpGroups'

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

---@param mirror BridgeMirror
---@param job string
---@param minGrade? integer
---@return boolean
local function holdsJob(mirror, job, minGrade)
    for _, membership in ipairs(mirror.jobs) do
        if membership.job == job and membership.grade >= (minGrade or 0) then return true end
    end
    return false
end

---@param mirror BridgeMirror
---@return AiGangMembership|nil
local function activeGang(mirror)
    for _, membership in ipairs(mirror.gangs) do
        if membership.gang == mirror.activeGang then return membership end
    end
    return nil
end

---@param mirror BridgeMirror
---@param gang string
---@param minGrade? integer
---@return boolean
local function holdsGang(mirror, gang, minGrade)
    local membership = activeGang(mirror)
    return membership ~= nil and membership.gang == gang and membership.grade >= (minGrade or 0)
end

--- The character's extra groups (name -> true).
---@param mirror BridgeMirror
---@return table<string, boolean>
local function extraGroups(mirror)
    local groups = mirror.metadata[META_KEY]
    return type(groups) == 'table' and groups or {}
end

---@param alias VrpGroupAlias|nil
---@return boolean
local function aliasUsed(alias)
    return alias ~= nil and (alias.admin or alias.job ~= '' or alias.gang ~= '')
end

---@param mirror BridgeMirror
---@param source integer
---@param group string
---@return boolean
local function hasGroupOf(mirror, source, group)
    local alias = BridgeVRP.config().groups[group]
    if aliasUsed(alias) then
        ---@cast alias VrpGroupAlias
        if alias.admin then return Bridge.isAdmin(source) end
        if alias.job ~= '' then return holdsJob(mirror, alias.job, alias.grade) end
        return holdsGang(mirror, alias.gang, alias.grade)
    end
    if group == 'admin' then return Bridge.isAdmin(source) end
    if Bridge.jobDefinitions()[group] then return holdsJob(mirror, group) end
    if Bridge.gangDefinitions()[group] then return holdsGang(mirror, group) end
    return extraGroups(mirror)[group] == true
end

--- Every group the character is in (name -> gtype or false): jobs, the active gang, extra groups, matching aliases.
---@param mirror BridgeMirror
---@param source integer
---@return table<string, string|false>
local function groupSet(mirror, source)
    local out = {}
    for _, membership in ipairs(mirror.jobs) do out[membership.job] = 'job' end
    local gang = activeGang(mirror)
    if gang then out[gang.gang] = 'gang' end
    for name, held in pairs(extraGroups(mirror)) do
        if held == true then out[name] = false end
    end
    for name, alias in pairs(BridgeVRP.config().groups) do
        if aliasUsed(alias) and not alias.admin and hasGroupOf(mirror, source, name) then
            out[name] = alias.job ~= '' and 'job' or 'gang'
        end
    end
    return out
end

---@param user_id any
---@return table<string, true>
function vRP.getUserGroups(user_id)
    local mirror, source = BridgeVRP.mirror(user_id)
    if not mirror then return {} end
    ---@cast source integer
    local out = {}
    for name in pairs(groupSet(mirror, source)) do out[name] = true end
    if Bridge.isAdmin(source) then out.admin = true end
    return out
end

---@param user_id any
---@param group any
---@return boolean
function vRP.hasGroup(user_id, group)
    local mirror, source = BridgeVRP.mirror(user_id)
    if not mirror or type(group) ~= 'string' then return false end
    ---@cast source integer
    return hasGroupOf(mirror, source, group)
end

--- `job` = ai-core's current job (`''` when unemployed), `gang` = the active gang; other types answer `''`.
---@param user_id any
---@param gtype any
---@return string
function vRP.getUserGroupByType(user_id, gtype)
    local mirror = BridgeVRP.mirror(user_id)
    if not mirror then return '' end
    if gtype == 'job' then
        local job = mirror.job.job
        return job ~= 'unemployed' and job or ''
    end
    if gtype == 'gang' then
        local gang = activeGang(mirror)
        return gang and gang.gang or ''
    end
    return ''
end

--- A job / gang label (an alias shows its job's grade label), else the name.
---@param group any
---@return string
function vRP.getGroupTitle(group)
    if type(group) ~= 'string' then return tostring(group) end
    local alias = BridgeVRP.config().groups[group]
    if aliasUsed(alias) then
        ---@cast alias VrpGroupAlias
        local definition = alias.job ~= '' and Bridge.jobDefinitions()[alias.job] or Bridge.gangDefinitions()[alias.gang]
        local grade = definition and definition.grades[alias.grade + 1]
        if grade then return grade.label end
    end
    local definition = Bridge.jobDefinitions()[group] or Bridge.gangDefinitions()[group]
    return definition and definition.label or group
end

---@param mirror BridgeMirror
---@param source integer
---@param group string
---@param held boolean
local function setExtraGroup(mirror, source, group, held)
    local next = {}
    for name, value in pairs(extraGroups(mirror)) do
        if value == true then next[name] = true end
    end
    next[group] = held or nil
    core:SetMeta(source, META_KEY, next)
end

--- Adds a group: a job / gang (alias: at its grade) through ai-core, anything else as an extra group. Admin groups
--- are refused (admin is an ace).
---@param user_id any
---@param group any
---@return boolean
function vRP.addUserGroup(user_id, group)
    local mirror, source = BridgeVRP.mirror(user_id)
    if not mirror or type(group) ~= 'string' or group == '' then return false end
    ---@cast source integer
    if hasGroupOf(mirror, source, group) then return true end
    local alias = BridgeVRP.config().groups[group]
    if group == 'admin' or (alias and alias.admin) then
        print(('^3[vRP] addUserGroup(%s, %s) from %s refused: admin rights come from the ai.admin ace^0'):format(user_id, group, BridgeVRP.caller()))
        return false
    end
    if aliasUsed(alias) then
        ---@cast alias VrpGroupAlias
        if alias.job ~= '' then return core:SetJob(source, alias.job, alias.grade) == true end
        return core:SetGang(source, alias.gang, alias.grade) == true
    end
    if Bridge.jobDefinitions()[group] then return core:SetJob(source, group, 0) == true end
    if Bridge.gangDefinitions()[group] then return core:SetGang(source, group, 0) == true end
    setExtraGroup(mirror, source, group, true)
    return true
end

--- Removes a group: a job / gang membership through ai-core, else the extra group.
---@param user_id any
---@param group any
---@return boolean
function vRP.removeUserGroup(user_id, group)
    local mirror, source = BridgeVRP.mirror(user_id)
    if not mirror or type(group) ~= 'string' then return false end
    ---@cast source integer
    local alias = BridgeVRP.config().groups[group]
    if group == 'admin' or (alias and alias.admin) then return false end
    if aliasUsed(alias) then
        ---@cast alias VrpGroupAlias
        if not hasGroupOf(mirror, source, group) then return false end
        if alias.job ~= '' then return core:RemoveJob(source, alias.job) == true end
        return core:RemoveGang(source, alias.gang) == true
    end
    if Bridge.jobDefinitions()[group] then return holdsJob(mirror, group) and core:RemoveJob(source, group) == true end
    if Bridge.gangDefinitions()[group] then
        for _, membership in ipairs(mirror.gangs) do
            if membership.gang == group then return core:RemoveGang(source, group) == true end
        end
        return false
    end
    if extraGroups(mirror)[group] ~= true then return false end
    setExtraGroup(mirror, source, group, false)
    return true
end

-- Permissions -------------------------------------------------------------------------------------------------------

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

-- Group events: `vRP:playerJoinGroup` / `vRP:playerLeaveGroup (user_id, group, gtype)` from the difference of the
-- character's groups after each job, gang or extra group change (also changes ai-core makes itself).
---@type table<integer, table<string, string|false>>
local known = {}

---@param source integer
---@param silent? boolean only take the current set (load, mapping change)
local function diffGroups(source, silent)
    local mirror = Bridge.players[source]
    if not mirror then return end
    local now = groupSet(mirror, source)
    local before = known[source]
    known[source] = now
    if silent or not before then return end
    local id = mirror.character.id
    for name, gtype in pairs(before) do
        if now[name] == nil then TriggerEvent('vRP:playerLeaveGroup', id, name, gtype or nil) end
    end
    for name, gtype in pairs(now) do
        if before[name] == nil then TriggerEvent('vRP:playerJoinGroup', id, name, gtype or nil) end
    end
end

Bridge.on('loaded', function(source) diffGroups(source, true) end)
Bridge.on('unloaded', function(source) known[source] = nil end)
Bridge.on('job', function(source) diffGroups(source) end)
Bridge.on('gang', function(source) diffGroups(source) end)
Bridge.on('meta', function(source, key)
    if key == META_KEY then diffGroups(source) end
end)

BridgeVRP.onConfig(function(config)
    indexRules(config)
    for source in pairs(Bridge.players) do diffGroups(source, true) end
end)

AddEventHandler('onResourceStop', function(resource)
    for name, entry in pairs(permissionFunctions) do
        if entry.owner == resource then permissionFunctions[name] = nil end
    end
end)

-- Characters already loaded when the bridge starts (ai-core restart): take their groups without events.
CreateThread(function()
    Wait(1500)
    for source in pairs(Bridge.players) do
        if not known[source] then diffGroups(source, true) end
    end
end)
