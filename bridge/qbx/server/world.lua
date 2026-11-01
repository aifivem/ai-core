-- qbx_core's world exports (routing buckets, vehicle and weapon lists, vehicle classes, session ids, vehicle
-- persistence flags) and the server half of modules/lib.lua's `qbx.spawnVehicle` (the `initVehicle` bag).

local provide = BridgeQbox.provide

-- Routing buckets: one store with the QB bridge (`QBCore.Player_Buckets` / `Entity_Buckets`), so QB and Qbox scripts
-- see each other's moves; Qbox's `GetBucketObjects` shape (source / entity -> bucket) is built from it.

local F = QBCore.Functions

provide('SetPlayerBucket', function(source, bucket) return F.SetPlayerBucket(tonumber(source), tonumber(bucket)) end)
provide('SetEntityBucket', function(entity, bucket) return F.SetEntityBucket(tonumber(entity), tonumber(bucket)) end)
provide('GetPlayersInBucket', function(bucket) return F.GetPlayersInBucket(tonumber(bucket) or 0) end)
provide('GetEntitiesInBucket', function(bucket) return F.GetEntitiesInBucket(tonumber(bucket) or 0) end)
provide('GetBucketObjects', function()
    local players, entities = {}, {}
    for _, entry in pairs(QBCore.Player_Buckets) do players[entry.id] = entry.bucket end
    for _, entry in pairs(QBCore.Entity_Buckets) do entities[entry.id] = entry.bucket end
    return players, entities
end)

-- Vehicles and weapons (ai-core's copies of qbx_core's shared lists).

provide('GetVehiclesByName', BridgeQbox.vehiclesByName)
provide('GetVehiclesByHash', BridgeQbox.vehiclesByHash)
provide('GetVehiclesByCategory', BridgeQbox.vehiclesByCategory)
provide('GetWeapons', BridgeQbox.weapons)
--- Deprecated in Qbox, whose own list is empty.
provide('GetLocations', function() return {} end)

--- GTA's vehicle class per category name of the shared vehicle list (GetVehicleClass numbering).
local CLASS_OF = {
    compacts = 0, sedans = 1, suvs = 2, coupes = 3, muscle = 4, sportsclassics = 5, sports = 6, super = 7,
    motorcycles = 8, offroad = 9, industrial = 10, utility = 11, vans = 12, cycles = 13, boats = 14,
    helicopters = 15, planes = 16, service = 17, emergency = 18, military = 19, commercial = 20, trains = 21,
    openwheel = 22,
}

--- Classes of models outside the shared list, from players' clients (the native is client-only); kept for the model
--- once two different players gave the same class, so one modified client cannot set it for everyone.
---@type table<integer, integer>
local vehicleClasses = {}

provide('GetVehicleClass', function(model)
    local hash = type(model) == 'string' and GetHashKey(model) or math.tointeger(tonumber(model))
    if not hash then return nil end
    local listed = BridgeQbox.vehiclesByHash()[hash]
    local fromList = listed and CLASS_OF[listed.category]
    if fromList then return fromList end
    local known = vehicleClasses[hash]
    if known then return known end
    -- Up to three loaded players are asked, picked before waiting (the player list may change meanwhile).
    local askers = {}
    for source in pairs(Bridge.players) do
        askers[#askers + 1] = source
        if #askers >= 3 then break end
    end
    local first, seen = nil, {}
    for _, source in ipairs(askers) do
        local class = math.tointeger(tonumber(aiLib.triggerClientCallback('ai-core:qbxVehicleClass', source, { hash }, 5000)))
        if class and class >= 0 and class <= 22 then
            if seen[class] then
                vehicleClasses[hash] = class
                return class
            end
            seen[class] = true
            first = first or class
        end
    end
    return first
end)

---@type integer
local sessionIds = 0

--- A `sessionId` bag on the entity, kept when it has one (Qbox's CreateSessionId).
provide('CreateSessionId', function(entity)
    local state = Entity(entity).state
    if state.sessionId then return state.sessionId end
    sessionIds = sessionIds + 1
    state:set('sessionId', sessionIds, true)
    return sessionIds
end)

--- Qbox's persistence flag (`persisted` bag). ai-core keeps no Qbox vehicle persistence: the flag is only set.
---@param vehicle integer
local function disablePersistence(vehicle)
    if DoesEntityExist(vehicle) then Entity(vehicle).state:set('persisted', nil, true) end
end

provide('EnablePersistence', function(vehicle)
    if DoesEntityExist(vehicle) then Entity(vehicle).state:set('persisted', true, true) end
end)
provide('DisablePersistence', disablePersistence)
provide('DeleteVehicle', function(vehicle)
    disablePersistence(vehicle)
    if DoesEntityExist(vehicle) then DeleteEntity(vehicle) end
end)

-- qbx.spawnVehicle (modules/lib.lua) sets `initVehicle` for the clients to clear the seats and place the vehicle; the
-- clients cannot clear a bag here (sv_stateBagStrictMode), so the server does once they had it.
AddStateBagChangeHandler('initVehicle', '', function(bagName, _, value)
    if value ~= true then return end
    local entity = GetEntityFromStateBagName(bagName)
    if entity == 0 then return end
    SetTimeout(3000, function()
        if DoesEntityExist(entity) and Entity(entity).state.initVehicle then Entity(entity).state:set('initVehicle', nil, true) end
    end)
end)
