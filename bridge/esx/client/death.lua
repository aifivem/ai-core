-- ESX on ai-core, client events: es_extended's spawn and death events (client/modules/death.lua, GPL-3.0), fed by the
-- game's damage events and ai-core's medical layer.

local ESX = ESX --[[@as ESXClient]]
local cache = aiLib.cache

-- Spawn and death ----------------------------------------------------------------------------------------------------

--- `esx:onPlayerDeath` went out since the last spawn or revive.
local deathSent = false


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

-- The character stands in the world: a new life. An external character screen spawns the ped and fires
-- esx:onPlayerSpawn itself, as es_extended leaves it to its multichar.
BridgeClient.on('spawned', function()
    deathSent = false
    if not BridgeClient.external then reportSpawn() end
end)
