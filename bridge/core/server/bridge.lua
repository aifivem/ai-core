-- ai-core's framework bridge, server side: creates `Bridge`, the namespace the ESX, QB and Qbox parts read (the
-- other files under bridge/core/server/ add to it), with ai-core's exports, export answering for provided names, the
-- per-player helpers and the callbacks' rate gate. No game logic lives in the bridge: every change goes to ai-core
-- (same resource, JS side) and the mirror (players.lua) follows ai-core's local delta events.

local core = exports['ai-core']

Bridge = {}

--- ai-core's exports (same resource, JS side).
Bridge.core = core

--- Answers `exports[name]:export(...)` for a name ai-core provides (exports are not aliased by `provide`).
---@param name string
---@param export string
---@param fn function
function Bridge.provideExport(name, export, fn)
    AddEventHandler(('__cfx_export_%s_%s'):format(name, export), function(setCB)
        setCB(fn)
    end)
end

---@param source integer
---@return string|nil
function Bridge.license(source)
    return GetPlayerIdentifierByType(tostring(source), 'license')
end

---@param source integer
---@return boolean
function Bridge.isAdmin(source)
    return aiLib.isAdmin(source)
end

local kinds = { primary = 'info', inform = 'info', info = 'info', success = 'success', error = 'error', warning = 'warning' }

--- A notification card through ai-core (QB / ESX notify types mapped to ai-core's kinds).
---@param source integer
---@param text string
---@param kind? string
---@param duration? integer
---@param title? string shown above the text
function Bridge.notify(source, text, kind, duration, title)
    if type(text) == 'table' then text = text.text or text.caption or '' end
    aiLib.notify(source, tostring(text), kinds[kind or 'info'] or 'info', duration, title ~= nil and tostring(title) or nil)
end

--- Calls an ai-core export whose last argument is a `done` callback and waits for its one answer (call from a
--- thread). Optional arguments before `done` are passed as nil.
---@param name string
---@param ... any
---@return any
function Bridge.await(name, ...)
    local answer = promise.new()
    local args = table.pack(...)
    args.n = args.n + 1
    args[args.n] = function(result) answer:resolve(result) end
    core[name](core, table.unpack(args, 1, args.n))
    return Citizen.Await(answer)
end

--- Callbacks of both frameworks share one gate: at most 30 requests per player in any 10 s.
local rates = aiLib.RateLimit.new(30, 10000)

---@param source integer
---@return boolean
function Bridge.allow(source)
    return rates:take(source)
end

AddEventHandler('playerDropped', function()
    rates:release(source)
end)
