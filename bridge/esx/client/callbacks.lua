-- ESX on ai-core, client side: ESX's server callbacks (TriggerServerCallback, AwaitServerCallback) and the client
-- callbacks the server calls (RegisterClientCallback).

local RESOURCE = GetCurrentResourceName()

---@param name string
---@param cb function
function ESX.TriggerServerCallback(name, cb, ...)
    BridgeClient.esxCallback(name, cb, ...)
end

--- ESX's await form of TriggerServerCallback.
---@param name string
---@return any
function ESX.AwaitServerCallback(name, ...)
    local p = promise.new()
    BridgeClient.esxCallback(name, function(...) p:resolve({ ... }) end, ...)
    return table.unpack(Citizen.Await(p))
end

--- The server waits 30 s for an answer (lib `triggerClientCallback`); an ESX callback that never calls `cb` is given up
--- after the same time.
local CALLBACK_TIMEOUT = 30000

---@type table<string, { owner: string, cb: function }>
local clientCallbacks = {}
--- Names already answered through the lib (its net handler stays for the session; a new owner just replaces the entry).
---@type table<string, boolean>
local libCallbacks = {}

--- Runs a registered ESX client callback (`function(cb, ...)`) and waits for its `cb(...)`: the first value goes back.
---@param name string
---@return any
local function answerCallback(name, ...)
    local entry = clientCallbacks[name]
    if not entry then error(('client callback %s does not exist'):format(name)) end
    local answer, done = promise.new(), false
    local function reply(...)
        if done then return end
        done = true
        answer:resolve({ ... })
    end
    SetTimeout(CALLBACK_TIMEOUT, function() reply() end)
    local ok, err = pcall(entry.cb, reply, ...)
    if not ok then error(err) end
    return Citizen.Await(answer)[1]
end

--- Registers a callback the server calls with `ESX.TriggerClientCallback` / `AwaitClientCallback` (ai-lib's client
--- callback wire, `aiLib.onServerCallback`).
---@param eventName string
---@param callback fun(cb: function, ...)
function ESX.RegisterClientCallback(eventName, callback)
    clientCallbacks[eventName] = { owner = GetInvokingResource() or RESOURCE, cb = callback }
    if libCallbacks[eventName] then return end
    libCallbacks[eventName] = true
    aiLib.onServerCallback(eventName, function(...) return answerCallback(eventName, ...) end)
end

---@param eventName string
---@return boolean
function ESX.DoesClientCallbackExist(eventName) return clientCallbacks[eventName] ~= nil end

AddEventHandler('onClientResourceStop', function(resource)
    for name, entry in pairs(clientCallbacks) do
        if entry.owner == resource then clientCallbacks[name] = nil end
    end
end)
