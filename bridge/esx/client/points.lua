-- ESX on ai-core, client side: the points behind ESX.Point (imports.lua), spheres of ai-lib's Zones.

---@class ESXPointInternal
---@field coords vector3
---@field distance number
---@field hidden? boolean
---@field enter function
---@field leave function
---@field resource string
---@field nearby? boolean

---@type table<integer, ESXPointInternal>
local points = {}
local nextPoint = 0
--- The points are spheres of ai-lib's Zones (one scheduler job for all of them, each checked every 500 ms).
local zones = aiLib.Zones.new()

---@param handle integer
local function leave(handle)
    local point = points[handle]
    if point and point.nearby then
        point.nearby = false
        BridgeUI.call(point.leave)
    end
end

---@param handle integer
local function watch(handle)
    local point = points[handle]
    zones:add(tostring(handle), {
        shape = { type = 'sphere', center = point.coords, radius = point.distance },
        onEnter = function()
            point.nearby = true
            BridgeUI.call(point.enter)
        end,
        onExit = function() leave(handle) end,
    })
end

---@param coords vector3
---@param distance number
---@param hidden? boolean
---@param enter function
---@param leave function
---@return integer
function ESX.CreatePointInternal(coords, distance, hidden, enter, leave)
    nextPoint = nextPoint + 1
    points[nextPoint] = {
        coords = vector3(coords.x, coords.y, coords.z),
        distance = distance,
        hidden = hidden,
        enter = enter,
        leave = leave,
        resource = GetInvokingResource() or GetCurrentResourceName(),
    }
    if not hidden then watch(nextPoint) end
    return nextPoint
end

---@param handle integer
function ESX.RemovePointInternal(handle)
    if not points[handle] then return end
    zones:remove(tostring(handle))
    leave(handle)
    points[handle] = nil
end

---@param handle integer
---@param hidden boolean
function ESX.HidePointInternal(handle, hidden)
    local point = points[handle]
    if not point or point.hidden == hidden then return end
    point.hidden = hidden
    if hidden then
        zones:remove(tostring(handle))
        leave(handle)
    else
        watch(handle)
    end
end

AddEventHandler('onClientResourceStop', function(resource)
    for handle, point in pairs(points) do
        if point.resource == resource then
            zones:remove(tostring(handle))
            points[handle] = nil
        end
    end
end)
