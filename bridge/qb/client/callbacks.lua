-- QB callbacks on the client: server callbacks (`TriggerCallback`) and the client callbacks the server asks.

--- `TriggerCallback(name, cb, ...)` answers `cb`; without a callback first it waits and returns the answer.
---@param name string
---@return any
function QBCore.Functions.TriggerCallback(name, ...)
    local cb = ...
    if BridgeUI.isCallable(cb) then return BridgeClient.qbCallback(name, cb, select(2, ...)) end
    local p = promise.new()
    BridgeClient.qbCallback(name, function(...) p:resolve({ ... }) end, ...)
    return table.unpack(Citizen.Await(p))
end

--- A handler the server asks with `QBCore.Functions.TriggerClientCallback(name, source, ...)`: `cb(respond, ...)`.
---@param name string
---@param cb fun(respond: fun(...), ...)
function QBCore.Functions.CreateClientCallback(name, cb)
    QBCore.ClientCallbacks[name] = cb
end

aiLib.onServerEvent('QBCore:Client:TriggerClientCallback', function(name, ...)
    local cb = QBCore.ClientCallbacks[name]
    if not cb then return end
    BridgeUI.call(cb, function(...) TriggerServerEvent('QBCore:Server:TriggerClientCallback', name, ...) end, ...)
end)
