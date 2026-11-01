-- ESX on ai-core, client events: es_extended's vehicle enter / exit / seat, ped and weapon events (client/modules/
-- actions.lua, GPL-3.0), fed by ai-core's cache watcher (`aiLib.cache`).

local ESX = ESX --[[@as ESXClient]]
local cache = aiLib.cache

-- Vehicles (es_extended client/modules/actions.lua, from the cache watcher instead of its 500 ms loop) --------------

---@type { vehicle: integer|false, seat: integer|false }
local tracked = { vehicle = false, seat = false }

---@param vehicle integer
---@return string|nil displayName, integer|nil netId, string|nil plate
local function vehicleData(vehicle)
    if not vehicle or not DoesEntityExist(vehicle) then return nil, nil, nil end
    local netId = NetworkGetEntityIsNetworked(vehicle) and VehToNet(vehicle) or vehicle
    return GetDisplayNameFromVehicleModel(GetEntityModel(vehicle)), netId, GetVehicleNumberPlateText(vehicle)
end

---@param vehicle integer
---@return integer
local function seatIn(vehicle)
    local ped = cache.ped
    for seat = -1, GetVehicleMaxNumberOfPassengers(vehicle) - 1 do
        if GetPedInVehicleSeat(vehicle, seat) == ped then return seat end
    end
    return -1
end

---@param vehicle integer|false
---@param seat integer|false
local function setVehicleStatus(vehicle, seat)
    ESX.SetPlayerData('vehicle', vehicle)
    ESX.SetPlayerData('seat', seat)
end

local function exited()
    local vehicle, seat = tracked.vehicle, tracked.seat
    if not vehicle then return end
    tracked.vehicle, tracked.seat = false, false
    local displayName, netId, plate = vehicleData(vehicle)
    setVehicleStatus(false, false)
    TriggerEvent('esx:exitedVehicle', vehicle, plate, seat, displayName, netId)
    TriggerServerEvent('esx:exitedVehicle', plate, seat, displayName, netId)
end

--- ai-core's watcher sees a vehicle once the ped sits in it, so `esx:enteringVehicle` comes right before
--- `esx:enteredVehicle` (es_extended fires it when the ped starts getting in).
---@param vehicle integer
local function entered(vehicle)
    local seat = seatIn(vehicle)
    tracked.vehicle, tracked.seat = vehicle, seat
    local displayName, netId, plate = vehicleData(vehicle)
    TriggerEvent('esx:enteringVehicle', vehicle, plate, seat, netId)
    TriggerServerEvent('esx:enteringVehicle', plate, seat, netId)
    setVehicleStatus(vehicle, seat)
    TriggerEvent('esx:enteredVehicle', vehicle, plate, seat, displayName, netId)
    TriggerServerEvent('esx:enteredVehicle', plate, seat, displayName, netId)
end

cache.onChange('vehicle', function(vehicle)
    if not ESX.PlayerLoaded then return end
    exited()
    if vehicle then entered(vehicle) end
end)

cache.onChange('seat', function(seat)
    if not ESX.PlayerLoaded or not tracked.vehicle or seat == false or seat == tracked.seat then return end
    tracked.seat = seat
    ESX.SetPlayerData('seat', seat)
    TriggerEvent('esx:vehicleSeatChanged', seat)
end)

cache.onChange('ped', function(ped)
    if ESX.PlayerLoaded then ESX.SetPlayerData('ped', ped) end
    TriggerEvent('esx:playerPedChanged', ped)
end)

cache.onChange('weapon', function(weapon)
    if ESX.PlayerLoaded then ESX.SetPlayerData('weapon', weapon) end
    TriggerEvent('esx:weaponChanged', weapon)
end)

-- A character that spawns in a vehicle enters it.
BridgeClient.on('spawned', function()
    if cache.vehicle then entered(cache.vehicle) end
end)

BridgeClient.on('unloaded', function()
    tracked.vehicle, tracked.seat = false, false
end)
