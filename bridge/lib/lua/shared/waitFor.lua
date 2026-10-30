---Waits (yielding) until `check` returns something other than nil and returns it; nil after `timeout` ms
---(default 10000, false = forever). `interval` is the ms between checks (default every tick).
---Return `cond or nil` to wait for a truthy condition.
---@generic T
---@param check fun(): T?
---@param timeout? integer|false
---@param interval? integer
---@return T?
return function(check, timeout, interval)
    if timeout == nil then timeout = 10000 end
    local started = GetGameTimer()
    while true do
        local value = check()
        if value ~= nil then return value end
        if timeout and GetGameTimer() - started > timeout then return nil end
        Wait(interval or 0)
    end
end
