-- Same wire format as the TypeScript lib: request `aicore:cb:<name>` (callerResource, id, ...args), answer
-- `aicore:cbr:<callerResource>` (id, ok, result), so Lua and TypeScript resources answer each other.

---@class AiLibClientInputOptions
---@field rate? { count: integer, windowMs: integer } calls per player per window (default 20 per second)
---@field lock? boolean one call at a time per player (a second one while the first runs is refused)
---@field ace? string the player needs this ace (`ai.admin` for ai-core admins)

local windows = {}
local locks = {}
AddEventHandler('playerDropped', function()
    local src = source
    for _, map in pairs(windows) do map[src] = nil end
    for _, map in pairs(locks) do map[src] = nil end
end)

---Answers a client's `triggerServerCallback(name, ...)`. The handler gets `(source, ...)` and its return value goes
---back; arguments come from a client: check every one (type, range, ownership, distance) before using it.
---@param name string
---@param handler fun(source: integer, ...: any): any
---@param options? AiLibClientInputOptions
return function(name, handler, options)
    options = options or {}
    local rate = options.rate or { count = 20, windowMs = 1000 }
    local window = {}
    local lock = {}
    windows[name] = window
    locks[name] = lock
    RegisterNetEvent(('aicore:cb:%s'):format(name), function(caller, id, ...)
        local src = source
        if type(caller) ~= 'string' or #caller > 64 or type(id) ~= 'number' then return end
        local reply = ('aicore:cbr:%s'):format(caller)
        local now = GetGameTimer()
        local w = window[src]
        if not w or now - w.start > rate.windowMs then
            w = { start = now, count = 0 }
            window[src] = w
        end
        w.count = w.count + 1
        local refused = w.count > rate.count
            or (options.ace and not IsPlayerAceAllowed(tostring(src), options.ace))
            or (options.lock and lock[src])
        if refused then return TriggerClientEvent(reply, src, id, false, nil) end
        if options.lock then lock[src] = true end
        local ok, result = pcall(handler, src, ...)
        if options.lock then lock[src] = nil end
        if not ok then print(('^1[%s] callback %s failed for %d: %s^0'):format(GetCurrentResourceName(), name, src, result)) end
        TriggerClientEvent(reply, src, id, ok, ok and result or nil)
    end)
end
