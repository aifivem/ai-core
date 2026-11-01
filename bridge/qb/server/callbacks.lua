-- QB callbacks both ways: server callbacks a client asks (`QBCore:Server:TriggerCallback`) and client callbacks the
-- server asks (`QBCore:Server:TriggerClientCallback`; the client half is bridge/qb/client/callbacks.lua).

local callbacks, playerId = BridgeQB.callbacks, BridgeQB.playerId

---@param name string
---@param cb fun(source: integer, cb: function, ...)
function QBCore.Functions.CreateCallback(name, cb)
    callbacks[name] = cb
end

RegisterNetEvent('QBCore:Server:TriggerCallback', function(name, ...)
    local src = source
    if type(name) ~= 'string' or not Bridge.allow(src) then return end
    local cb = callbacks[name]
    if not cb then return end
    cb(src, function(...)
        TriggerClientEvent('QBCore:Client:TriggerCallback', src, name, ...)
    end, ...)
end)

local CLIENT_CALLBACK_TIMEOUT = 30000

--- Asks a player's client callback (`QBCore.Functions.CreateClientCallback` there): `cb(...)` when the first extra
--- argument is a function, else waits and returns the first answer (nil after 30 s).
---@param name string
---@param source integer
---@param ... any
---@return any
function QBCore.Functions.TriggerClientCallback(name, source, ...)
    local id = playerId(source)
    if type(name) ~= 'string' or not id then return end
    local args = table.pack(...)
    local cb
    local first = 1
    if BridgeQB.isCallable(args[1]) then
        cb = args[1]
        first = 2
    end
    local key = name .. '\0' .. id
    local entry = { callback = cb, promise = promise.new() }
    QBCore.ClientCallbacks[key] = entry
    SetTimeout(CLIENT_CALLBACK_TIMEOUT, function()
        if QBCore.ClientCallbacks[key] ~= entry then return end
        QBCore.ClientCallbacks[key] = nil
        entry.promise:resolve(nil)
    end)
    TriggerClientEvent('QBCore:Client:TriggerClientCallback', id, name, table.unpack(args, first, args.n))
    if cb == nil then return Citizen.Await(entry.promise) end
end

RegisterNetEvent('QBCore:Server:TriggerClientCallback', function(name, ...)
    local src = source
    if type(name) ~= 'string' then return end
    local key = name .. '\0' .. src
    local entry = QBCore.ClientCallbacks[key]
    -- Only a request this player was asked can be answered.
    if not entry or not Bridge.allow(src) then return end
    QBCore.ClientCallbacks[key] = nil
    entry.promise:resolve((...))
    if entry.callback then entry.callback(...) end
end)
