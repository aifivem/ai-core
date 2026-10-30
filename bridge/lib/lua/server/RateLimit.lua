---@class AiLibRateLimit
---@field private count integer
---@field private window integer
---@field private hits table<integer, integer[]>
local RateLimit = {}
RateLimit.__index = RateLimit

---Per-player burst limit, like the TypeScript lib's `RateLimit`: at most `count` actions inside any `windowMs`.
---Call `limit:release(source)` from playerDropped.
---@param count integer
---@param windowMs integer
---@return AiLibRateLimit
function RateLimit.new(count, windowMs)
    return setmetatable({ count = count, window = windowMs, hits = {} }, RateLimit)
end

---Counts one action; false when the player is over the limit.
---@param source integer
---@return boolean
function RateLimit:take(source)
    local now = GetGameTimer()
    local list = self.hits[source]
    if not list then
        list = {}
        self.hits[source] = list
    end
    local kept = 0
    for i = 1, #list do
        if now - list[i] < self.window then
            kept = kept + 1
            list[kept] = list[i]
        end
    end
    for i = #list, kept + 1, -1 do list[i] = nil end
    if kept >= self.count then return false end
    list[kept + 1] = now
    return true
end

---@param source integer
function RateLimit:release(source)
    self.hits[source] = nil
end

return RateLimit
