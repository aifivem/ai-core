-- ESX on ai-core, client side: ESX.DisableSpawnManager and ESX.SpawnPlayer.

--- ai-core runs no spawnmanager; switches its auto spawn off when one runs anyway.
function ESX.DisableSpawnManager()
    if GetResourceState('spawnmanager') == 'started' then exports.spawnmanager:setAutoSpawn(false) end
end

--- ESX's SpawnPlayer: the skin through `skinchanger:loadSkin` (whatever clothing script answers it, up to 3 s), the
--- player moved there by ai-lib's teleport and brought back to life, then `playerSpawned` and `cb`. ai-core spawns
--- characters itself; this serves scripts that move or respawn the player with it.
---@param skin? table
---@param coords vector3|vector4|table
---@param cb? function
function ESX.SpawnPlayer(skin, coords, cb)
    if type(skin) == 'table' then
        local loaded = false
        TriggerEvent('skinchanger:loadSkin', skin, function() loaded = true end)
        aiLib.waitFor(function() return loaded or nil end, 3000)
    end
    local heading = (coords.heading or coords.w or 0.0) + 0.0
    aiLib.player.teleport(coords, { heading = heading, fade = false })
    NetworkResurrectLocalPlayer(coords.x + 0.0, coords.y + 0.0, coords.z + 0.0, heading, 0, true)
    TriggerEvent('playerSpawned', coords)
    if cb then BridgeUI.call(cb) end
end
