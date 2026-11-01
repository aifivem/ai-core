-- QBCore.Functions vehicle properties and spawning, and qb-core's vehicle enter / leave events.

local F = QBCore.Functions
local origin, invoker = BridgeQBClient.origin, BridgeQBClient.invoker

--- Vehicle properties in ox_lib's shape (the same keys as qb-core's; extras are 0 = on / 1 = off); nil without a vehicle.
---@param vehicle integer
---@return VehicleProperties|nil
function F.GetVehicleProperties(vehicle) return BridgeVehicleProps.get(vehicle) end

---@param vehicle integer
---@param props VehicleProperties
function F.SetVehicleProperties(vehicle, props)
    if not DoesEntityExist(vehicle) or type(props) ~= 'table' then return end
    BridgeVehicleProps.set(vehicle, props)
end

--- True when no vehicle stands within `radius` of `coords` (default the local ped).
---@param coords? vector3|table
---@param radius number
---@return boolean
function F.SpawnClear(coords, radius)
    return aiLib.isSpawnClear(origin(coords), radius)
end

---@param model integer
---@param coords vector4
---@return integer
local function localVehicle(model, coords)
    if not aiLib.requestModel(model, 5000) then return 0 end
    local vehicle = CreateVehicle(model, coords.x, coords.y, coords.z, coords.w, false, false)
    SetModelAsNoLongerNeeded(model)
    return vehicle
end

local warnedSpawn = false

--- qb-core's client spawn. A networked vehicle (the default) is made by the server through the
--- `QBCore:Server:SpawnVehicle` callback (the entity lockdown blocks client-made networked vehicles) and `cb` gets it
--- once it exists here; without an answer in 10 s a local vehicle only this player sees is made instead. Does not
--- wait: `cb` runs later.
---@param model string|integer
---@param cb? fun(vehicle: integer)
---@param coords? vector3|vector4|table
---@param isnetworked? boolean
---@param teleportInto? boolean
function F.SpawnVehicle(model, cb, coords, isnetworked, teleportInto)
    local hash = type(model) == 'string' and joaat(model) or model --[[@as integer]]
    if not IsModelInCdimage(hash) then return end
    local at = origin(coords)
    local spot = vector4(at.x, at.y, at.z, coords and coords.w or GetEntityHeading(aiLib.cache.ped))
    CreateThread(function()
        local vehicle = 0
        if isnetworked == nil or isnetworked then
            local p, settled = promise.new(), false
            BridgeClient.qbCallback('QBCore:Server:SpawnVehicle', function(netId)
                if settled then return end
                settled = true
                p:resolve(netId or false)
            end, hash, spot, teleportInto == true)
            SetTimeout(10000, function()
                if settled then return end
                settled = true
                p:resolve(false)
            end)
            local netId = Citizen.Await(p)
            if netId then vehicle = aiLib.waitForEntity(netId) end
            if vehicle == 0 and not warnedSpawn then
                warnedSpawn = true
                print(('^3[ai-core bridge] QBCore.Functions.SpawnVehicle (%s): the server did not spawn the vehicle, a local one is used^0'):format(invoker()))
            end
        end
        if vehicle == 0 then vehicle = localVehicle(hash, spot) end
        if vehicle == 0 then return end
        SetVehicleHasBeenOwnedByPlayer(vehicle, true)
        SetVehicleNeedsToBeHotwired(vehicle, false)
        SetVehRadioStation(vehicle, 'OFF')
        SetVehicleFuelLevel(vehicle, 100.0)
        if teleportInto then TaskWarpPedIntoVehicle(aiLib.cache.ped, vehicle, -1) end
        BridgeUI.call(cb, vehicle)
    end)
end

-- Vehicle enter / leave (qb-core fires them from baseevents through the server; here from ai-lib's cache) ---------

---@param vehicle integer
---@param seat integer
---@return table
local function vehicleInfo(vehicle, seat)
    return {
        vehicle = vehicle,
        seat = seat,
        name = GetDisplayNameFromVehicleModel(GetEntityModel(vehicle)),
        plate = F.GetPlate(vehicle),
        driver = GetPedInVehicleSeat(vehicle, -1),
        inseat = GetPedInVehicleSeat(vehicle, seat),
        haskeys = aiLib.vehicleKeys.has(vehicle),
    }
end

aiLib.cache.onChange('vehicle', function(vehicle, old)
    local seat = aiLib.cache.seat or -1
    if old and DoesEntityExist(old) then TriggerEvent('QBCore:Client:LeftVehicle', vehicleInfo(old, seat)) end
    if vehicle then
        -- The seat arrives right after the vehicle on the same watcher pass.
        SetTimeout(0, function()
            if aiLib.cache.vehicle == vehicle then TriggerEvent('QBCore:Client:EnteredVehicle', vehicleInfo(vehicle, aiLib.cache.seat or -1)) end
        end)
    end
end)
