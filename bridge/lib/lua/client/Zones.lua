-- Areas of a resource with enter / exit callbacks, like the TypeScript lib's `Zones`: one scheduler job checks every
-- zone of the resource at the shortest interval any zone asks for, each zone at its own interval (default 500 ms, at
-- least 50); the job runs only while zones exist.

---@alias AiLibZoneShape
---| { type: 'sphere', center: vector3|{x: number, y: number, z: number}, radius: number }
---| { type: 'cylinder', center: vector3|{x: number, y: number, z: number}, radius: number, height: number }
---| { type: 'poly', points: {x: number, y: number}[], minZ: number, maxZ: number }

---@class AiLibZoneOptions
---@field shape AiLibZoneShape
---@field interval? integer ms between checks (default 500)
---@field onEnter? fun()
---@field onExit? fun()

local groups = {}

---@param shape AiLibZoneShape
---@param x number
---@param y number
---@param z number
---@return boolean
local function contains(shape, x, y, z)
    if shape.type == 'sphere' then
        local c = shape.center
        return (x - c.x) ^ 2 + (y - c.y) ^ 2 + (z - c.z) ^ 2 <= shape.radius ^ 2
    elseif shape.type == 'cylinder' then
        local c = shape.center
        return (x - c.x) ^ 2 + (y - c.y) ^ 2 <= shape.radius ^ 2 and math.abs(z - c.z) <= shape.height
    end
    if z < shape.minZ or z > shape.maxZ then return false end
    local inside = false
    local points = shape.points
    local j = #points
    for i = 1, #points do
        local a, b = points[i], points[j]
        if (a.y > y) ~= (b.y > y) and x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x then inside = not inside end
        j = i
    end
    return inside
end

local function check()
    local now = GetGameTimer()
    local x, y, z = table.unpack(GetEntityCoords(aiLib.cache.ped))
    for _, group in ipairs(groups) do
        for _, zone in pairs(group.zones) do
            if now >= zone.next then
                zone.next = now + zone.interval
                local inside = contains(zone.shape, x, y, z)
                if inside ~= zone.inside then
                    zone.inside = inside
                    local hook = inside and zone.onEnter or zone.onExit
                    if hook then
                        local ok, err = pcall(hook)
                        if not ok then print(('^1[%s] zone callback failed: %s^0'):format(GetCurrentResourceName(), err)) end
                    end
                end
            end
        end
    end
end

---Zones per interval, so the shortest one is found without walking every zone.
---@type table<integer, integer>
local intervals = {}
---@type AiLibJob?
local job
local period = 0

local function schedule()
    local shortest = 0
    for interval in pairs(intervals) do
        if shortest == 0 or interval < shortest then shortest = interval end
    end
    if shortest == period then return end
    period = shortest
    if job then job:stop() end
    job = shortest > 0 and aiLib.every(shortest, check, { name = 'zones' }) or nil
end

---@class AiLibZones
---@field private zones table<string, table>
local Zones = {}
Zones.__index = Zones

---A new group of zones (`clear()` removes them all).
---@return AiLibZones
function Zones.new()
    local self = setmetatable({ zones = {} }, Zones)
    groups[#groups + 1] = self
    return self
end

---Adds (or replaces) a zone; `onExit` runs for a replaced zone the player was in.
---@param id string
---@param options AiLibZoneOptions
function Zones:add(id, options)
    self:remove(id)
    self.zones[id] = {
        shape = options.shape,
        interval = math.max(50, options.interval or 500),
        onEnter = options.onEnter,
        onExit = options.onExit,
        inside = false,
        next = 0,
    }
    local interval = self.zones[id].interval
    intervals[interval] = (intervals[interval] or 0) + 1
    schedule()
end

---@param id string
function Zones:remove(id)
    local zone = self.zones[id]
    if not zone then return end
    self.zones[id] = nil
    local left = intervals[zone.interval] - 1
    intervals[zone.interval] = left > 0 and left or nil
    schedule()
    if zone.inside and zone.onExit then pcall(zone.onExit) end
end

function Zones:clear()
    for id in pairs(self.zones) do self:remove(id) end
end

---@param id string
---@return boolean
function Zones:isInside(id)
    local zone = self.zones[id]
    return zone ~= nil and zone.inside
end

return Zones
