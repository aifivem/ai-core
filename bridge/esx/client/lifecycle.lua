-- ESX on ai-core, client events: the loadout restore and loading screen events on spawn, and es_extended's pause menu
-- event while a character plays.

local firstSpawn = true

-- Pause menu: the game has no event for it, so it is read every 500 ms (es_extended's rate) while a character plays.
local inPauseMenu = false
local pauseMenu = aiLib.every(500, function()
    local active = IsPauseMenuActive()
    if active == inPauseMenu then return end
    inPauseMenu = active
    TriggerEvent('esx:pauseMenuActive', active)
end, { active = false, name = 'esxPauseMenu' })

-- The character stands in the world (PlayerData was built and esx:playerLoaded went out on 'loaded').
BridgeClient.on('spawned', function()
    TriggerEvent('esx:restoreLoadout')
    if firstSpawn then
        firstSpawn = false
        TriggerEvent('esx:loadingScreenOff')
    end
    pauseMenu:set(true)
end)

BridgeClient.on('unloaded', function()
    pauseMenu:set(false)
    inPauseMenu = false
end)
