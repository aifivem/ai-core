-- ESX on ai-core, client side: ESX.Game's vehicle spawn and properties, the `VehicleProperties` bag and the vehicle
-- types, copied from es_extended 1.12.4 / 1.16.3 (GPL-3.0).

---@type table<string, boolean>
local warnedNetworked = {}

--- ESX spawns a networked vehicle from the client; ai-core's entity lockdown lets only the server create networked
--- entities, so this is a local vehicle only this player sees (warned once per resource). Networked vehicles come from
--- the server (`ESX.OneSync.SpawnVehicle`).
---@param vehicleModel string|integer
---@param coords vector3|vector4|table
---@param heading number
---@param cb? fun(vehicle: integer)
---@param networked? boolean
---@return integer|nil
function ESX.Game.SpawnVehicle(vehicleModel, coords, heading, cb, networked)
    local resource = GetInvokingResource() or GetCurrentResourceName()
    if networked ~= false and not warnedNetworked[resource] then
        warnedNetworked[resource] = true
        print(('^3[ai-core bridge] %s spawns a networked vehicle with ESX.Game.SpawnVehicle: the server creates networked vehicles on ai-core (entity lockdown), so it is a local vehicle only this player sees. Use ESX.OneSync.SpawnVehicle on the server.^0'):format(resource))
    end
    return ESX.Game.SpawnLocalVehicle(vehicleModel, coords, heading, cb and function(vehicle) BridgeUI.call(cb, vehicle) end or nil)
end

---@param vehicle integer
---@return VehicleProperties|nil
function ESX.Game.GetVehicleProperties(vehicle)
    return BridgeVehicleProps.get(vehicle)
end

---@param vehicle integer
---@param props VehicleProperties
function ESX.Game.SetVehicleProperties(vehicle, props)
    BridgeVehicleProps.set(vehicle, props)
end

-- ESX's server spawn (`ESX.OneSync.SpawnVehicle`, ESX's vehicle class) puts the properties in the vehicle's
-- `VehicleProperties` state bag; the client that owns the vehicle applies them (a new server vehicle gets its owner a
-- moment after the bag arrives, so the owner is waited for). Only the server can write that bag.
---@diagnostic disable-next-line: param-type-mismatch
AddStateBagChangeHandler('VehicleProperties', nil, function(bagName, _, value, _, replicated)
    if replicated or type(value) ~= 'table' or not bagName:find('^entity:') then return end
    local netId = tonumber((bagName:gsub('^entity:', '')))
    if not netId then return end
    CreateThread(function()
        local vehicle = aiLib.waitForEntity(netId, 4000)
        if vehicle == 0 then return end
        local me = PlayerId()
        if not aiLib.waitFor(function() return NetworkGetEntityOwner(vehicle) == me or nil end, 3000, 100) then return end
        BridgeVehicleProps.set(vehicle, value)
    end)
end)

--- Game vehicle classes that are not cars, and models whose class says otherwise (txAdmin's list, via es_extended).
local classTypes = { [8] = 'bike', [11] = 'trailer', [13] = 'bike', [14] = 'boat', [15] = 'heli', [16] = 'plane', [21] = 'train' }
local mismatchedTypes = {
    [`airtug`] = 'automobile', [`avisa`] = 'submarine', [`blimp`] = 'heli', [`blimp2`] = 'heli', [`blimp3`] = 'heli',
    [`caddy`] = 'automobile', [`caddy2`] = 'automobile', [`caddy3`] = 'automobile', [`chimera`] = 'automobile',
    [`docktug`] = 'automobile', [`forklift`] = 'automobile', [`kosatka`] = 'submarine', [`mower`] = 'automobile',
    [`policeb`] = 'bike', [`ripley`] = 'automobile', [`rrocket`] = 'automobile', [`sadler`] = 'automobile',
    [`sadler2`] = 'automobile', [`scrap`] = 'automobile', [`slamtruck`] = 'automobile', [`Stryder`] = 'automobile',
    [`submersible`] = 'submarine', [`submersible2`] = 'submarine', [`thruster`] = 'heli', [`towtruck`] = 'automobile',
    [`towtruck2`] = 'automobile', [`tractor`] = 'automobile', [`tractor2`] = 'automobile', [`tractor3`] = 'automobile',
    [`trailersmall2`] = 'trailer', [`utillitruck`] = 'automobile', [`utillitruck2`] = 'automobile', [`utillitruck3`] = 'automobile',
}

--- The `CreateVehicleServerSetter` type of a model, false when the game has no such vehicle.
---@param model string|integer
---@return string|false
function ESX.GetVehicleTypeClient(model)
    model = type(model) == 'string' and joaat(model) or model
    if not IsModelInCdimage(model) or not IsModelAVehicle(model) then return false end
    return mismatchedTypes[model] or classTypes[GetVehicleClassFromName(model)] or 'automobile'
end

ESX.GetVehicleType = ESX.GetVehicleTypeClient
