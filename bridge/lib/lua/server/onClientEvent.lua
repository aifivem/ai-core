-- A net event from clients through the same gate as `onClientCallback`: real player, rate (default 10 per second),
-- optional ace and lock. The handler gets `(source, ...)`; check every argument (type, range, ownership, distance).

local windows = {}
AddEventHandler('playerDropped', function()
    local src = source
    for _, map in pairs(windows) do map[src] = nil end
end)

---@param name string
---@param handler fun(source: integer, ...: any)
---@param options? { rate?: { count: integer, windowMs: integer }, ace?: string }
return function(name, handler, options)
    options = options or {}
    local rate = options.rate or { count = 10, windowMs = 1000 }
    local window = {}
    windows[name] = window
    RegisterNetEvent(name, function(...)
        local src = source
        -- A local TriggerEvent by another resource carries no player.
        if type(src) ~= 'number' or src <= 0 or not GetPlayerName(src) then return end
        local now = GetGameTimer()
        local w = window[src]
        if not w or now - w.start > rate.windowMs then
            w = { start = now, count = 0 }
            window[src] = w
        end
        w.count = w.count + 1
        if w.count > rate.count then return end
        if options.ace and not IsPlayerAceAllowed(tostring(src), options.ace) then return end
        local ok, err = pcall(handler, src, ...)
        if not ok then print(('^1[%s] event %s failed for %d: %s^0'):format(GetCurrentResourceName(), name, src, err)) end
    end)
end
