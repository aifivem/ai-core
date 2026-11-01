-- vRP 1 server API on ai-core, groups. Signatures: vRP 1.0 `vrp/modules/group.lua` (same names in vRPex, Zirix,
-- Dunko); how groups map onto ai-core: bridge/vrp/v1/server/group_match.lua.

local core = Bridge.core
local vRP = BridgeVRP.proxy

local META_KEY, activeGang, extraGroups = BridgeVRP.groupMetaKey, BridgeVRP.activeGang, BridgeVRP.extraGroups
local holdsJob, aliasUsed, hasGroupOf, groupSet = BridgeVRP.holdsJob, BridgeVRP.aliasUsed, BridgeVRP.hasGroupOf, BridgeVRP.groupSet

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
