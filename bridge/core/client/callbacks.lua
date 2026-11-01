-- ai-core's framework bridge, client side: QB's and ESX's server callback requests and their answers.

--- Callback requests of both frameworks: request id -> the caller's function.
---@type table<string, function>
local pending = {}
local nextId = 0

---@param name string
---@param cb function
function BridgeClient.qbCallback(name, cb, ...)
    pending['qb:' .. name] = cb
    TriggerServerEvent('QBCore:Server:TriggerCallback', name, ...)
end

RegisterNetEvent('QBCore:Client:TriggerCallback', function(name, ...)
    local cb = pending['qb:' .. tostring(name)]
    pending['qb:' .. tostring(name)] = nil
    if cb then cb(...) end
end)

---@param name string
---@param cb function
function BridgeClient.esxCallback(name, cb, ...)
    nextId = nextId + 1
    pending['esx:' .. nextId] = cb
    TriggerServerEvent('esx:triggerServerCallback', name, nextId, GetInvokingResource() or 'ai-core', ...)
end

RegisterNetEvent('esx:serverCallback', function(requestId, _, ...)
    local cb = pending['esx:' .. tostring(requestId)]
    pending['esx:' .. tostring(requestId)] = nil
    if cb then cb(...) end
end)
