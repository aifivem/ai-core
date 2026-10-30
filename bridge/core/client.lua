-- ai-core's framework bridge, client side: the player's mirror (one snapshot from the server bridge, then patches)
-- and ai-core's notify for every framework's notify call.

---@class BridgeClientState
---@field loaded boolean
---@field character table|nil
---@field money table<string, number>
---@field job table|nil
---@field gang table|nil
---@field license string|nil
---@field name string|nil

---@type BridgeClientState
BridgeClient = { loaded = false, character = nil, money = {}, job = nil, gang = nil, license = nil, name = nil }

---@type table<string, fun(...)[]>
local listeners = { loaded = {}, unloaded = {}, money = {}, job = {}, gang = {} }

---@param kind 'loaded'|'unloaded'|'money'|'job'|'gang'
---@param fn fun(...)
function BridgeClient.on(kind, fn)
    listeners[kind][#listeners[kind] + 1] = fn
end

local function emitChange(kind, ...)
    for i = 1, #listeners[kind] do
        local ok, err = pcall(listeners[kind][i], ...)
        if not ok then print(('^1[ai-core bridge] %s handler failed: %s^0'):format(kind, err)) end
    end
end

--- Answers `exports[name]:export(...)` for a name ai-core provides.
---@param name string
---@param export string
---@param fn function
function BridgeClient.provideExport(name, export, fn)
    AddEventHandler(('__cfx_export_%s_%s'):format(name, export), function(setCB)
        setCB(fn)
    end)
end

local kinds = { primary = 'info', inform = 'info', info = 'info', success = 'success', error = 'error', warning = 'warning' }

---@param text string|table
---@param kind? string
---@param duration? integer
function BridgeClient.notify(text, kind, duration)
    if type(text) == 'table' then text = text.text or text.caption or '' end
    exports['ai-core']:Notify({ text = tostring(text), kind = kinds[kind or 'info'] or 'info', duration = duration })
end

RegisterNetEvent('ai-core:bridge:snapshot', function(data)
    if type(data) ~= 'table' then return end
    BridgeClient.character = data.character
    BridgeClient.money = data.money or {}
    BridgeClient.job = data.job
    BridgeClient.gang = data.gang
    BridgeClient.license = data.license
    BridgeClient.name = data.name
    BridgeClient.loaded = true
    emitChange('loaded')
end)

RegisterNetEvent('ai-core:bridge:patch', function(part, value)
    if not BridgeClient.loaded then return end
    if part == 'money' and type(value) == 'table' then
        for account, balance in pairs(value) do
            BridgeClient.money[account] = balance
            emitChange('money', account, balance)
        end
    elseif part == 'job' and type(value) == 'table' then
        local last = BridgeClient.job
        BridgeClient.job = value
        emitChange('job', value, last)
    elseif part == 'gang' and type(value) == 'table' then
        BridgeClient.gang = value
        emitChange('gang', value)
    end
end)

AddEventHandler('ai-core:client:playerUnloaded', function()
    if not BridgeClient.loaded then return end
    BridgeClient.loaded = false
    emitChange('unloaded')
    BridgeClient.character, BridgeClient.job, BridgeClient.gang, BridgeClient.money = nil, nil, nil, {}
end)

-- Framework notify events other scripts send to this client.
RegisterNetEvent('QBCore:Notify', function(text, kind, length) BridgeClient.notify(text, kind, length) end)
RegisterNetEvent('esx:showNotification', function(text, kind, length) BridgeClient.notify(text, kind, length) end)

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
