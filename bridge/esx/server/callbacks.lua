-- ESX on ai-core, server side: ESX's server callbacks (the scripts' and es_extended's own), client callbacks and
-- client events.

local getPlayerFromId = BridgeESX.getPlayerFromId

---@type table<string, fun(source: integer, cb: function, ...)>
local callbacks = {}

---@param name string
---@param cb fun(source: integer, cb: function, ...)
function ESX.RegisterServerCallback(name, cb)
    callbacks[name] = cb
end

---@param name string
---@return boolean
function ESX.DoesServerCallbackExist(name) return callbacks[name] ~= nil end

--- Asks a player's client (`ESX.RegisterClientCallback` there); `cb` gets the first value it answers (nil on timeout).
---@param player integer
---@param eventName string
---@param cb function
function ESX.TriggerClientCallback(player, eventName, cb, ...)
    local args = table.pack(...)
    CreateThread(function()
        local result = aiLib.triggerClientCallback(eventName, player, { table.unpack(args, 1, args.n) })
        cb(result)
    end)
end

--- Waits for a player's client callback (call from a thread); nil on timeout.
---@param player integer
---@param eventName string
---@return any
function ESX.AwaitClientCallback(player, eventName, ...)
    return (aiLib.triggerClientCallback(eventName, player, { ... }))
end

---@param eventName string
---@param playerIds integer|integer[]
function ESX.TriggerClientEvent(eventName, playerIds, ...)
    if type(playerIds) == 'number' then return TriggerClientEvent(eventName, playerIds, ...) end
    for i = 1, #playerIds do TriggerClientEvent(eventName, playerIds[i], ...) end
end

RegisterNetEvent('esx:triggerServerCallback', function(name, requestId, invoker, ...)
    local src = source
    if type(name) ~= 'string' or not Bridge.allow(src) then return end
    local cb = callbacks[name]
    if not cb then return end
    cb(src, function(...)
        TriggerClientEvent('esx:serverCallback', src, requestId, invoker, ...)
    end, ...)
end)

-- es_extended's own server callbacks.
---@param x xPlayer
---@return table
local function playerData(x)
    return { identifier = x.identifier, accounts = x.getAccounts(), inventory = x.getInventory(), job = x.getJob(), loadout = x.getLoadout(), money = x.getMoney(), position = x.getCoords(true), metadata = x.getMeta() }
end
callbacks['esx:getPlayerData'] = function(source, cb)
    local x = getPlayerFromId(source)
    cb(x and playerData(x) or nil)
end
callbacks['esx:isUserAdmin'] = function(source, cb) cb(Bridge.isAdmin(source)) end
callbacks['esx:getGameBuild'] = function(_, cb) cb(tonumber(GetConvar('sv_enforceGameBuild', '1604'))) end
callbacks['esx:getOtherPlayerData'] = function(source, cb, target)
    local x = Bridge.isAdmin(source) and getPlayerFromId(target) or nil
    cb(x and playerData(x) or nil)
end
callbacks['esx:getPlayerNames'] = function(source, cb, players)
    if type(players) ~= 'table' then return cb({}) end
    local out = {}
    for playerId in pairs(players) do
        local x = playerId ~= source and getPlayerFromId(playerId) or nil
        if x then out[playerId] = x.getName() end
    end
    cb(out)
end
