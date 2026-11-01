-- vRP 1 groups on ai-core: what a character holds. vRP groups map onto ai-core: a job name = a job membership (any
-- grade), a gang name = the active gang, `admin` = the `ai.admin` ace, a panel alias (`groups` in data/vrp.json) = a
-- job / gang grade or admin, anything else = an "extra group" kept in character metadata `vrpGroups`.

local META_KEY = 'vrpGroups'

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

BridgeVRP.groupMetaKey = META_KEY
BridgeVRP.holdsJob = holdsJob
BridgeVRP.activeGang = activeGang
BridgeVRP.holdsGang = holdsGang
BridgeVRP.extraGroups = extraGroups
BridgeVRP.aliasUsed = aliasUsed
BridgeVRP.hasGroupOf = hasGroupOf
BridgeVRP.groupSet = groupSet
