-- ESX on ai-core, client events: the ones es_extended fires (spawn, death, vehicle enter / exit / seat, ped, weapon,
-- pause menu) fed from ai-core's cache watcher (`aiLib.cache`) and medical layer, and the server -> client events
-- es_extended handles (player data, admin actions, teleports). Server events go through `aiLib.onServerEvent`: a local
-- emit by another resource is dropped, so nothing here runs without the server asking. Logic follows es_extended 1.16.3
-- (GPL-3.0). Loaded after bridge/esx/client.lua, shared.lua, game.lua and ui.lua.

local ESX = ESX --[[@as ESXClient]]
local cache = aiLib.cache

-- Spawn and death ----------------------------------------------------------------------------------------------------

--- `esx:onPlayerDeath` went out since the last spawn or revive.
local deathSent = false
local firstSpawn = true

---@param coords vector3
---@return { x: number, y: number, z: number }
local function rounded(coords)
    local round = ESX.Math.Round
    return { x = round(coords.x, 1), y = round(coords.y, 1), z = round(coords.z, 1) }
end

--- es_extended's death report (client/modules/death.lua): who killed the player, how and from where.
local function reportDeath()
    if deathSent or not ESX.PlayerLoaded then return end
    deathSent = true
    local ped = PlayerPedId()
    local coords = GetEntityCoords(ped)
    local killer = GetPedSourceOfDeath(ped)
    local killerId = NetworkGetPlayerIndexFromPed(killer)
    local data = { victimCoords = rounded(coords), killedByPlayer = false, deathCause = GetPedCauseOfDeath(ped) }
    if killer ~= ped and killerId ~= -1 and NetworkIsPlayerActive(killerId) then
        local killerCoords = GetEntityCoords(killer)
        data.killedByPlayer = true
        data.killerCoords = rounded(killerCoords)
        data.distance = ESX.Math.Round(#(coords - killerCoords), 1)
        data.killerServerId = GetPlayerServerId(killerId)
        data.killerClientId = killerId
    end
    TriggerEvent('esx:onPlayerDeath', data)
    ---@diagnostic disable-next-line: fivem/event-wrong-side -- ESX server scripts listen to it as a net event
    TriggerServerEvent('esx:onPlayerDeath', data)
end

--- es_extended's spawn report: `esx:onPlayerSpawn` here and on the server.
local function reportSpawn()
    TriggerEvent('esx:onPlayerSpawn')
    ---@diagnostic disable-next-line: fivem/event-wrong-side -- ESX server scripts listen to it as a net event
    TriggerServerEvent('esx:onPlayerSpawn')
end

local function alive()
    deathSent = false
    if not ESX.PlayerLoaded then return end
    ESX.SetPlayerData('ped', PlayerPedId())
    ESX.SetPlayerData('dead', false)
end

AddEventHandler('esx:onPlayerSpawn', alive)
AddEventHandler('playerSpawned', alive)
AddEventHandler('esx:onPlayerDeath', function(_data)
    if not ESX.PlayerLoaded then return end
    ESX.SetPlayerData('ped', PlayerPedId())
    ESX.SetPlayerData('dead', true)
end)

-- The game's death of the local ped (esx_ambulancejob and similar learn of a death only from esx:onPlayerDeath).
AddEventHandler('gameEventTriggered', function(name, args)
    if name ~= 'CEventNetworkEntityDamage' or args[1] ~= cache.ped then return end
    local ped = cache.ped
    if IsPedDeadOrDying(ped, true) or IsPedFatallyInjured(ped) then reportDeath() end
end)

-- ai-core's medical layer: a death script that keeps the ped alive while it is down, and revives.
AddEventHandler('ai-core:client:dead', function(dead)
    if dead then
        reportDeath()
    elseif deathSent and ESX.PlayerLoaded then
        reportSpawn()
    end
end)

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

-- Pause menu: the game has no event for it, so it is read every 500 ms (es_extended's rate) while a character plays.
local inPauseMenu = false
local pauseMenu = aiLib.every(500, function()
    local active = IsPauseMenuActive()
    if active == inPauseMenu then return end
    inPauseMenu = active
    TriggerEvent('esx:pauseMenuActive', active)
end, { active = false, name = 'esxPauseMenu' })

-- Character load and unload ------------------------------------------------------------------------------------------

-- The character stands in the world (PlayerData was built and esx:playerLoaded went out on 'loaded'). An external
-- character screen spawns the ped and fires esx:onPlayerSpawn itself, as es_extended leaves it to its multichar.
BridgeClient.on('spawned', function()
    deathSent = false
    if not BridgeClient.external then reportSpawn() end
    TriggerEvent('esx:restoreLoadout')
    if firstSpawn then
        firstSpawn = false
        TriggerEvent('esx:loadingScreenOff')
    end
    pauseMenu:set(true)
    if cache.vehicle then entered(cache.vehicle) end
end)

---@type AiLibJob|nil
local noclip

BridgeClient.on('unloaded', function()
    pauseMenu:set(false)
    inPauseMenu = false
    tracked.vehicle, tracked.seat = false, false
    if noclip then
        noclip:stop()
        noclip = nil
    end
end)

-- Player data the server sends (es_extended client/modules/player/lifecycle.lua) -----------------------------------

aiLib.onServerEvent('esx:setMaxWeight', function(maxWeight) ESX.SetPlayerData('maxWeight', maxWeight) end)
aiLib.onServerEvent('esx:setInventory', function(inventory)
    if type(inventory) == 'table' then ESX.SetPlayerData('inventory', inventory) end
end)
aiLib.onServerEvent('esx:setGroup', function(group) ESX.SetPlayerData('group', group) end)
aiLib.onServerEvent('esx:updatePlayerData', function(key, value)
    if type(key) == 'string' then ESX.SetPlayerData(key, value) end
end)
aiLib.onServerEvent('esx:registerSuggestions', function(commands)
    if type(commands) ~= 'table' then return end
    for name, command in pairs(commands) do
        if type(command) == 'table' and command.suggestion then
            TriggerEvent('chat:addSuggestion', ('/%s'):format(name), command.suggestion.help, command.suggestion.arguments)
        end
    end
end)
aiLib.onServerEvent('esx:executeCommand', function(command)
    if type(command) == 'string' and command:find('%S') then ExecuteCommand(command) end
end)
aiLib.onServerEvent('esx:requestModel', function(model) aiLib.requestModel(model) end)

-- Admin actions the server sends (es_extended client/modules/admin) -------------------------------------------------

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
