-- Qbox on ai-core, server side: the `exports.qbx_core:*` functions Qbox scripts call. Player objects are the QB ones
-- (bridge/qb/server.lua); Qbox's group functions read ai-core's memberships from the shared mirror.

local core = Bridge.core

local function provide(name, fn) Bridge.provideExport('qbx_core', name, fn) end

--- A player by server id or citizenid (Qbox accepts both).
---@param identifier integer|string
---@return integer|nil
local function sourceOf(identifier)
    if type(identifier) == 'number' then return Bridge.players[identifier] and identifier or nil end
    if type(identifier) == 'string' then return tonumber(identifier) and Bridge.players[tonumber(identifier)] and tonumber(identifier) or Bridge.sourceByCitizenId(identifier) end
end

provide('GetPlayer', function(identifier)
    local source = sourceOf(identifier)
    return source and BridgeQB.getPlayer(source) or nil
end)
provide('GetPlayerByCitizenId', BridgeQB.getPlayerByCitizenId)
provide('GetOfflinePlayer', BridgeQB.getPlayerByCitizenId)
provide('GetQBPlayers', function() return QBCore.Functions.GetQBPlayers() end)
provide('GetPlayersData', function()
    local out = {}
    for source in pairs(Bridge.players) do
        local player = BridgeQB.getPlayer(source)
        if player then out[#out + 1] = player.PlayerData end
    end
    return out
end)
provide('GetJobs', function() return BridgeQB.sharedJobs() end)
provide('GetGangs', function() return BridgeQB.sharedGangs() end)
provide('GetJob', function(name) return BridgeQB.sharedJobs()[name] end)
provide('GetGang', function(name) return BridgeQB.sharedGangs()[name] end)
provide('Notify', function(source, text, kind, duration) Bridge.notify(source, text, kind, duration) end)
provide('CreateUseableItem', function(name, cb) QBCore.Functions.CreateUseableItem(name, cb) end)
--- Qbox answers the callback itself (ox_inventory calls it with `(source, item)`).
provide('CanUseItem', function(name)
    if not core:IsUsableItem(name) then return nil end
    return function(source, item) return Bridge.useItem(source, name, item) end
end)

---@param identifier integer|string
---@param job string
---@param grade? integer
provide('SetJob', function(identifier, job, grade)
    local source = sourceOf(identifier)
    return source ~= nil and core:SetJob(source, job, grade or 0)
end)
provide('AddPlayerToJob', function(identifier, job, grade)
    local source = sourceOf(identifier)
    return source ~= nil and core:SetJob(source, job, grade or 0)
end)
provide('RemovePlayerFromJob', function(identifier, job)
    local source = sourceOf(identifier)
    return source ~= nil and core:RemoveJob(source, job)
end)
provide('SetPlayerPrimaryJob', function(identifier, job)
    local source = sourceOf(identifier)
    return source ~= nil and core:SetDuty(source, job)
end)
provide('SetJobDuty', function(identifier, onDuty)
    local source = sourceOf(identifier)
    if not source then return end
    local job = Bridge.jobOf(Bridge.players[source])
    core:SetDuty(source, onDuty and job.name or nil)
end)
provide('AddPlayerToGang', function(identifier, gang, grade)
    local source = sourceOf(identifier)
    return source ~= nil and core:SetGang(source, gang, grade or 0)
end)
provide('RemovePlayerFromGang', function(identifier, gang)
    local source = sourceOf(identifier)
    return source ~= nil and core:RemoveGang(source, gang)
end)

--- Groups of a player: jobs and gangs by name with their grade (Qbox's GetGroups).
---@param source integer
---@return table<string, integer>
local function groupsOf(source)
    local mirror = Bridge.players[source]
    local out = {}
    if not mirror then return out end
    for _, m in ipairs(mirror.jobs) do out[m.job] = m.grade end
    for _, m in ipairs(mirror.gangs) do out[m.gang] = m.grade end
    return out
end

local match = BridgeShapes.matchGroup

provide('GetGroups', groupsOf)
provide('HasGroup', function(source, filter) return match(groupsOf(source), filter) end)
provide('HasPrimaryGroup', function(source, filter)
    local mirror = Bridge.players[source]
    if not mirror then return end
    local primary = {}
    local job = Bridge.jobOf(mirror)
    primary[job.name] = job.grade
    local gang = Bridge.gangOf(mirror)
    if gang.name ~= 'none' then primary[gang.name] = gang.grade end
    return match(primary, filter)
end)

--- On-duty count of a job and the on-duty sources (Qbox's GetDutyCountJob).
---@param job string
---@return integer, integer[]
local function dutyCount(job)
    local sources = {}
    for source in pairs(Bridge.onDutyIn(job)) do sources[#sources + 1] = source end
    return #sources, sources
end

provide('GetDutyCountJob', dutyCount)
provide('GetDutyCountType', function(jobType)
    local sources = {}
    for job, definition in pairs(Bridge.jobDefinitions()) do
        if definition.type == jobType then
            for source in pairs(Bridge.onDutyIn(job)) do sources[#sources + 1] = source end
        end
    end
    return #sources, sources
end)

provide('GetSource', function(identifier) return sourceOf(identifier) end)
provide('IsPlayerLoaded', function(source) return Bridge.players[source] ~= nil end)
provide('Login', function() return false end)
provide('Logout', function(source) core:SwitchCharacter(source) end)
provide('GetCoreObject', function() return BridgeQB.coreObject() end)
