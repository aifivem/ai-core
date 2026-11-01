-- ESX on ai-core, client events: the admin actions the server sends (es_extended client/modules/admin, GPL-3.0) and
-- older es_extended's /car and /dv events. Server events go through `aiLib.onServerEvent`: a local emit by another
-- resource is dropped, so nothing here runs without the server asking.

local ESX = ESX --[[@as ESXClient]]

---@type AiLibJob|nil
local noclip

aiLib.onServerEvent('esx:killPlayer', function() SetEntityHealth(PlayerPedId(), 0) end)

aiLib.onServerEvent('esx:freezePlayer', function(input)
    if input ~= 'freeze' and input ~= 'unfreeze' then return end
    local frozen = input == 'freeze'
    aiLib.player.freeze(frozen)
    SetEntityCollision(PlayerPedId(), not frozen, not frozen)
    SetPlayerInvincible(PlayerId(), frozen)
end)

aiLib.onServerEvent('esx:repairPedVehicle', function()
    local vehicle = GetVehiclePedIsIn(PlayerPedId(), false)
    if vehicle == 0 or not DoesEntityExist(vehicle) then return end
    SetVehicleEngineHealth(vehicle, 1000.0)
    SetVehicleEngineOn(vehicle, true, true, false)
    SetVehicleFixed(vehicle)
    SetVehicleDirtLevel(vehicle, 0.0)
end)

aiLib.onServerEvent('esx:teleport', function(coords)
    if type(coords) ~= 'table' and type(coords) ~= 'vector3' and type(coords) ~= 'vector4' then return end
    if not tonumber(coords.x) or not tonumber(coords.y) then return end
    aiLib.player.teleport(coords, { heading = tonumber(coords.heading or coords.w), keepVehicle = true })
end)

aiLib.onServerEvent('esx:tpm', function()
    local waypoint = aiLib.waypoint()
    if not waypoint then return BridgeClient.notify(BridgeUI.text('BRIDGE_NO_WAYPOINT'), 'error') end
    aiLib.player.teleport(waypoint, { ground = 'find', keepVehicle = true })
end)

local noclipPos, noclipHeading = vector3(0, 0, 0), 0.0

--- es_extended's noclip, one step per frame from ai-lib's scheduler while it is on.
local function noclipStep()
    local ped = PlayerPedId()
    SetEntityCoordsNoOffset(ped, noclipPos.x, noclipPos.y, noclipPos.z, false, false, true)
    if IsControlPressed(1, 34) then
        noclipHeading = (noclipHeading + 1.5) % 360
        SetEntityHeading(ped, noclipHeading)
    end
    if IsControlPressed(1, 9) then
        noclipHeading = (noclipHeading - 1.5) % 360
        SetEntityHeading(ped, noclipHeading)
    end
    if IsControlPressed(1, 8) then noclipPos = GetOffsetFromEntityInWorldCoords(ped, 0.0, 1.0, 0.0) end
    if IsControlPressed(1, 32) then noclipPos = GetOffsetFromEntityInWorldCoords(ped, 0.0, -1.0, 0.0) end
    if IsControlPressed(1, 27) then noclipPos = GetOffsetFromEntityInWorldCoords(ped, 0.0, 0.0, 1.0) end
    if IsControlPressed(1, 173) then noclipPos = GetOffsetFromEntityInWorldCoords(ped, 0.0, 0.0, -1.0) end
end

aiLib.onServerEvent('esx:noclip', function()
    if noclip then
        noclip:stop()
        noclip = nil
        return BridgeClient.notify(BridgeUI.text('BRIDGE_NOCLIP_OFF'), 'error')
    end
    local ped = PlayerPedId()
    noclipPos, noclipHeading = GetEntityCoords(ped), GetEntityHeading(ped)
    noclip = aiLib.every(0, noclipStep, { name = 'esxNoclip' })
    BridgeClient.notify(BridgeUI.text('BRIDGE_NOCLIP_ON'), 'success')
end)

-- Older es_extended's /car and /dv events: the vehicle is local (ESX.Game.SpawnVehicle), and only vehicles this
-- client owns can be deleted here (the server deletes the others).
aiLib.onServerEvent('esx:spawnVehicle', function(model)
    if type(model) ~= 'string' and type(model) ~= 'number' then return end
    local ped = PlayerPedId()
    local vehicle = ESX.Game.SpawnVehicle(model, GetEntityCoords(ped), GetEntityHeading(ped))
    if vehicle then TaskWarpPedIntoVehicle(ped, vehicle, -1) end
end)

aiLib.onServerEvent('esx:deleteVehicle', function(radius)
    local ped = PlayerPedId()
    local targets = {}
    radius = tonumber(radius)
    if radius then
        targets = ESX.Game.GetVehiclesInArea(GetEntityCoords(ped), radius + 0.01)
    else
        local vehicle = GetVehiclePedIsIn(ped, false)
        if vehicle == 0 then vehicle = ESX.Game.GetVehicleInDirection() or 0 end
        if vehicle ~= 0 then targets = { vehicle } end
    end
    for _, vehicle in ipairs(targets) do
        if not NetworkGetEntityIsNetworked(vehicle) or NetworkGetEntityOwner(vehicle) == PlayerId() then ESX.Game.DeleteVehicle(vehicle) end
    end
end)

BridgeClient.on('unloaded', function()
    if noclip then
        noclip:stop()
        noclip = nil
    end
end)
