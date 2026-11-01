local V = BridgeVRP2
local vRP = V.vRP
local run, v1, coreExtension = V.run, V.v1, V.coreExtension

-- Group: groups and permissions from the panel's vRP mapping (vRP 1 group functions); `!name` permission functions
-- registered by vRP 2 extensions get the user.
---@type table<string, { fn: function, owner: VrpOwner|nil }>
local permissionFunctions = {}

local GroupUser = {}

---@param name any
---@return boolean
function GroupUser:hasGroup(name) return v1('hasGroup', false, self.cid, name) == true end
---@return table<string, true>
function GroupUser:getGroups() return v1('getUserGroups', {}, self.cid) or {} end
---@param name any
function GroupUser:addGroup(name) v1('addUserGroup', nil, self.cid, name) end
---@param name any
function GroupUser:removeGroup(name) v1('removeUserGroup', nil, self.cid, name) end

--- `job` = ai-core's current job, `gang` = the active gang; nil when none.
---@param gtype any
---@return string|nil
function GroupUser:getGroupByType(gtype)
    local name = v1('getUserGroupByType', '', self.cid, gtype)
    return name ~= '' and name or nil
end

---@param perm any
---@return boolean
function GroupUser:hasPermission(perm)
    if type(perm) ~= 'string' then return false end
    if perm:sub(1, 1) == '!' then
        local params = splitString(perm:sub(2), '.')
        if params[1] == 'not' then return not self:hasPermission('!' .. table.concat(params, '.', 2)) end
        local entry = permissionFunctions[params[1] or '']
        if entry then
            local rets = table.pack(run(entry.owner, entry.fn, self, params))
            return rets[1] and rets[2] and true or false
        end
    end
    return v1('hasPermission', false, self.cid, perm) == true
end

---@param perms any
---@return boolean
function GroupUser:hasPermissions(perms)
    if type(perms) ~= 'table' then return false end
    for _, perm in pairs(perms) do
        if not self:hasPermission(perm) then return false end
    end
    return true
end

local Group = coreExtension('Group', { cfg = { groups = {}, selectors = {} }, func_perms = {} }, nil, GroupUser)

---@param ids any
---@return table[]
local function usersOf(ids)
    local out = {}
    for _, id in ipairs(type(ids) == 'table' and ids or {}) do
        local user = vRP.users_by_cid[id]
        if user and user:isReady() then out[#out + 1] = user end
    end
    return out
end

---@param name any
---@return table[]
function Group:getUsersByGroup(name) return usersOf(v1('getUsersByGroup', {}, name)) end

---@param perm any
---@return table[]
function Group:getUsersByPermission(perm)
    if type(perm) == 'string' and perm:sub(1, 1) == '!' then
        local out = {}
        for _, user in pairs(vRP.users) do
            if user:isReady() and user:hasPermission(perm) then out[#out + 1] = user end
        end
        return out
    end
    return usersOf(v1('getUsersByPermission', {}, perm))
end

---@param name any
---@return string|nil
function Group:getGroupTitle(name)
    local title = v1('getGroupTitle', nil, name)
    return title ~= '' and title or nil
end

--- `callback(user, params)` answers `!name.<params>`; it goes when its script stops.
---@param name any
---@param callback any
function Group:registerPermissionFunction(name, callback)
    if type(name) ~= 'string' or type(callback) ~= 'function' then return end
    local entry = { fn = callback, owner = V.owner() }
    permissionFunctions[name] = entry
    self.func_perms[name] = callback
    V.track(function()
        if permissionFunctions[name] == entry then
            permissionFunctions[name] = nil
            self.func_perms[name] = nil
        end
    end)
end
