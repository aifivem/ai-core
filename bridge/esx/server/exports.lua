-- ESX on ai-core, server side: es_extended's exports (ai-core provides `es_extended`) and `esx:getSharedObject`.

local core = Bridge.core
local getPlayerFromId = BridgeESX.getPlayerFromId

--- Saves the player now (ai-core `SavePlayer`: position and metadata, then its queued money and membership writes);
--- `esx:playerSaved` and `cb(success)` follow the save.
---@param playerId integer
---@param cb? fun(success: boolean)
local function savePlayer(playerId, cb)
    local x = getPlayerFromId(playerId)
    if not x then
        if cb then cb(false) end
        return
    end
    core:SavePlayer(x.source, function(ok)
        if ok then TriggerEvent('esx:playerSaved', x.source, x) end
        if cb then cb(ok == true) end
    end)
end
BridgeESX.savePlayer = savePlayer

Bridge.provideExport('es_extended', 'getSharedObject', function() return ESX end)
Bridge.provideExport('es_extended', 'SavePlayer', savePlayer)
--- `ESX.Player(src).method(...)` of es_extended's own imports.lua.
Bridge.provideExport('es_extended', 'RunStaticPlayerMethod', function(src, method, ...)
    local x = getPlayerFromId(src)
    if not x then return end
    if not ESX.IsFunctionReference(x[method]) then error(('Attempted to call invalid method on playerId %s: %s'):format(src, method)) end
    return x[method](...)
end)
--- Runs `action(xPlayer)` as one account operation (ai-core keeps the data; nothing else is locked).
Bridge.provideExport('es_extended', 'WithPlayerPersistence', function(identifier, action)
    local x = ESX.GetPlayerFromIdentifier(identifier)
    if x and not x.beginAccountOperation() then return false, 'session_closing' end
    local ok, result, detail = pcall(action, x)
    if x then x.endAccountOperation() end
    if not ok then
        print(('[es_extended] Persistence operation failed: %s'):format(tostring(result)))
        return false, result
    end
    return result, detail
end)
--- ESX's job vehicle storage writes its own `owned_vehicles` table, which ai-core does not have: nothing is stored.
Bridge.provideExport('es_extended', 'StoreJobVehicle', function() return false end)

AddEventHandler('esx:getSharedObject', function(cb)
    cb(ESX)
end)
