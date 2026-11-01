-- Qbox on ai-core, client side: `exports.qbx_core:*`, Qbox's PlayerData additions (`jobs`, `gangs`, `bankAuth`,
-- metadata defaults) on the QB PlayerData (bridge/qb/client.lua), qbx_core's client events fired locally from ai-core's
-- player data channel, and the client handlers modules/lib.lua relies on (vehicle properties, `initVehicle`).
-- `QBX.PlayerData` for scripts that include `@qbx_core/modules/playerdata.lua` is ai-core's modules/playerdata.lua.

local function provide(name, fn) BridgeClient.provideExport('qbx_core', name, fn) end

-- Job / gang definitions in Qbox's shape, from ai-core's client definitions (dropped when the panel changes one).

---@type { jobs: table<string, QboxJob>|nil, gangs: table<string, QboxGang>|nil }
local definitions = {}

---@return table<string, QboxJob>
local function qboxJobs()
    definitions.jobs = definitions.jobs or BridgeQbox.jobs(exports['ai-core']:GetDefinitions('jobs') or {})
    return definitions.jobs
end

---@return table<string, QboxGang>
local function qboxGangs()
    definitions.gangs = definitions.gangs or BridgeQbox.gangs(exports['ai-core']:GetDefinitions('gangs') or {})
    return definitions.gangs
end

AddEventHandler('ai-core:client:definitions', function(file, name, value)
    local valid = type(value) == 'table' and type(value.grades) == 'table'
    if file == 'jobs' then
        definitions.jobs = nil
        TriggerEvent('qbx_core:client:onJobUpdate', name, valid and BridgeQbox.job(value) or nil)
    elseif file == 'gangs' then
        definitions.gangs = nil
        TriggerEvent('qbx_core:client:onGangUpdate', name, valid and BridgeQbox.gang(value) or nil)
    end
end)

-- Qbox's PlayerData additions, kept from ai-core's channel.

---@type table<string, integer>
local jobs = {}
---@type table<string, integer>
local gangs = {}
--- The last value of each metadata key (qbx_core's onSetMetaData hands the old value).
---@type table<string, any>
local metaBefore = {}

---@param list any
---@param key 'job'|'gang'
---@return table<string, integer>
local function membershipMap(list, key)
    local out = {}
    if type(list) ~= 'table' then return out end
    for _, m in ipairs(list) do
        if type(m) == 'table' and type(m[key]) == 'string' then out[m[key]] = tonumber(m.grade) or 0 end
    end
    return out
end

--- Puts Qbox's fields on the QB PlayerData table (it keeps its identity until the next load).
---@return table data
local function extend()
    local data = BridgeQBClient.getPlayerData()
    if not data.citizenid then return data end
    data.jobs, data.gangs = jobs, gangs
    local job, gang = data.job --[[@as table?]], data.gang --[[@as table?]]
    if job then job.bankAuth = job.isboss == true end
    if gang then gang.bankAuth = gang.isboss == true end
    if data.metadata then BridgeQbox.fillMeta(data.metadata) end
    return data
end

---@param before table<string, integer>
---@param after table<string, integer>
local function groupUpdates(before, after)
    for name, grade in pairs(after) do
        if before[name] ~= grade then TriggerEvent('qbx_core:client:onGroupUpdate', name, grade) end
    end
    for name in pairs(before) do
        if after[name] == nil then TriggerEvent('qbx_core:client:onGroupUpdate', name) end
    end
end

---@param data table ai-core's player data (`AiPlayerData`)
local function takeSnapshot(data)
    jobs, gangs = membershipMap(data.jobs, 'job'), membershipMap(data.gangs, 'gang')
    metaBefore = {}
    for key, value in pairs(type(data.metadata) == 'table' and data.metadata or {}) do metaBefore[key] = value end
end

--- The QB PlayerData with Qbox's fields, also while QB's load events run (before this file's load handler): a
--- PlayerData built for a new load has no `jobs` yet, so the snapshot is read from ai-core once.
---@return table
local function playerData()
    local data = BridgeQBClient.getPlayerData()
    if data.citizenid and data.jobs == nil then
        local snapshot = exports['ai-core']:GetPlayerData()
        if type(snapshot) == 'table' then takeSnapshot(snapshot) end
        extend()
    end
    return data
end

-- Runs after the QB part built the PlayerData for this load (bridge/qb/client.lua registered its listener first).
BridgeClient.on('loaded', function(data)
    takeSnapshot(data)
    TriggerEvent('QBCore:Player:SetPlayerData', extend())
end)

RegisterNetEvent('ai-core:client:playerData', function(key, value)
    if key ~= 'jobs' and key ~= 'gangs' then return end
    local before = key == 'jobs' and jobs or gangs
    local after = membershipMap(value, key == 'jobs' and 'job' or 'gang')
    if key == 'jobs' then jobs = after else gangs = after end
    if not BridgeClient.loaded then return end
    local data = extend()
    groupUpdates(before, after)
    TriggerEvent('QBCore:Player:SetPlayerData', data)
end)

BridgeClient.on('job', function()
    local job = BridgeQBClient.getPlayerData().job --[[@as table?]]
    if job then job.bankAuth = job.isboss == true end
end)

BridgeClient.on('gang', function()
    local gang = BridgeQBClient.getPlayerData().gang --[[@as table?]]
    if gang then gang.bankAuth = gang.isboss == true end
end)

BridgeClient.on('meta', function(key, value)
    local old = metaBefore[key]
    metaBefore[key] = value
    local data = BridgeQBClient.getPlayerData()
    if value == nil and data.metadata then
        local default = BridgeQbox.metaDefaults()[key]
        if default ~= nil then data.metadata[key] = default end
    end
    TriggerEvent('qbx_core:client:onSetMetaData', key, old, value)
end)

-- qbx_core's Logout: the character screen opens again (ai-core unloads the client only for a switch).
BridgeClient.on('unloaded', function()
    jobs, gangs, metaBefore = {}, {}, {}
    TriggerEvent('qbx_core:client:playerLoggedOut')
end)

-- Exports.

provide('GetPlayerData', playerData)
provide('Notify', function(text, kind, duration, subTitle)
    local title, description = BridgeQbox.notifyParts(text, subTitle)
    BridgeClient.notify(description or '', kind, duration, title)
end)
provide('IsLoggedIn', function() return BridgeClient.loaded end)
provide('GetGroups', function() return BridgeQbox.groups(playerData()) end)
provide('HasGroup', function(filter) return BridgeQbox.hasGroup(filter, playerData()) end)
provide('HasPrimaryGroup', function(filter) return BridgeQbox.hasGroup(filter, playerData(), true) end)
provide('GetJobs', qboxJobs)
provide('GetGangs', qboxGangs)
provide('GetJob', function(name) return qboxJobs()[name] end)
provide('GetGang', function(name) return qboxGangs()[name] end)
provide('GetVehiclesByName', BridgeQbox.vehiclesByName)
provide('GetVehiclesByHash', BridgeQbox.vehiclesByHash)
provide('GetVehiclesByCategory', BridgeQbox.vehiclesByCategory)
provide('GetWeapons', BridgeQbox.weapons)
--- Deprecated in Qbox, whose own list is empty.
provide('GetLocations', function() return {} end)

-- modules/lib.lua's qbx.spawnVehicle: the entity owner applies the properties, retrying for a second like qbx_core.
RegisterNetEvent('qbx_core:client:setVehicleProperties', function(netId, props)
    if type(props) ~= 'table' or type(netId) ~= 'number' then return end
    aiLib.waitFor(function()
        if not NetworkDoesEntityExistWithNetworkId(netId) then return nil end
        local vehicle = NetToVeh(netId)
        if vehicle ~= 0 and NetworkGetEntityOwner(vehicle) == PlayerId() and BridgeVehicleProps.set(vehicle, props) then return true end
        return nil
    end, 1000, 50)
end)

-- `initVehicle`: the owner clears the front seats of peds it owns and puts the vehicle on the ground (the server
-- clears the bag, bridge/qbx/server_world.lua).
AddStateBagChangeHandler('initVehicle', '', function(bagName, _, init)
    if not init then return end
    CreateThread(function()
        local vehicle = aiLib.waitFor(function()
            local entity = GetEntityFromStateBagName(bagName)
            return entity ~= 0 and entity or nil
        end, 10000)
        if not vehicle then return end
        local me = PlayerPedId()
        for _, seat in ipairs({ -1, 0 }) do
            local ped = GetPedInVehicleSeat(vehicle, seat)
            if ped ~= me and ped > 0 and NetworkGetEntityOwner(ped) == PlayerId() then DeleteEntity(ped) end
        end
        aiLib.waitFor(function() return not IsEntityWaitingForWorldCollision(vehicle) or nil end, 5000)
        if DoesEntityExist(vehicle) and NetworkGetEntityOwner(vehicle) == PlayerId() then SetVehicleOnGroundProperly(vehicle) end
    end)
end)

-- GetVehicleClass on the server asks a client (the native is client-only).
aiLib.onServerCallback('ai-core:qbxVehicleClass', function(hash)
    if type(hash) ~= 'number' or not IsModelInCdimage(hash) or not IsModelAVehicle(hash) then return nil end
    return GetVehicleClassFromName(hash)
end)
