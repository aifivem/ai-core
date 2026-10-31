-- vRP 1 server API on ai-core, areas: `vRP.setArea(source, name, x, y, z, radius, height, cb_enter, cb_leave)`,
-- `removeArea`, `inArea` (vRP 1.0 `vrp/modules/map.lua`). The player's client watches the cylinder
-- (`tvRP.setArea`, bridge/vrp/v1/client_map.lua) and reports on the rate-gated server tunnel; the server runs
-- `cb_enter` only when the player's ped really is inside (a client cannot fire a far area).

local vRP = BridgeVRP.proxy

--- Extra metres a reported enter may be off (movement between the client check and the server read).
local TOLERANCE = 3.0

---@class VrpArea
---@field x number
---@field y number
---@field z number
---@field radius number
---@field height number
---@field enter any callable
---@field leave any callable
---@field inside boolean
---@field owner string

---@type table<integer, table<string, VrpArea>>
local areas = {}

---@param source integer
---@param name string
---@param area VrpArea
local function leave(source, name, area)
    if not area.inside then return end
    area.inside = false
    BridgeVRP.call(area.leave, source, name)
end

---@param source any
---@param name any
---@param x any
---@param y any
---@param z any
---@param radius any
---@param height any
---@param cb_enter any
---@param cb_leave any
function vRP.setArea(source, name, x, y, z, radius, height, cb_enter, cb_leave)
    source = tonumber(source)
    x, y, z, radius = tonumber(x), tonumber(y), tonumber(z), tonumber(radius)
    if not source or not GetPlayerName(source) or type(name) ~= 'string' or not (x and y and z and radius) then return end
    height = tonumber(height) or 6
    local list = areas[source] or {}
    areas[source] = list
    local old = list[name]
    list[name] = {
        x = x, y = y, z = z, radius = radius, height = height, enter = cb_enter, leave = cb_leave,
        inside = old ~= nil and old.inside, owner = BridgeVRP.caller(),
    }
    BridgeVRP.client._setArea(source, name, x, y, z, radius, height)
end

---@param source any
---@param name any
---@return boolean|nil
function vRP.inArea(source, name)
    local list = areas[tonumber(source) or -1]
    local area = list and list[name]
    if area then return area.inside end
    return nil
end

---@param source any
---@param name any
function vRP.removeArea(source, name)
    source = tonumber(source)
    local list = source and areas[source]
    if not list or type(name) ~= 'string' then return end
    BridgeVRP.client._removeArea(source, name)
    local area = list[name]
    if not area then return end
    list[name] = nil
    leave(source, name, area)
end

--- Client report: the ped entered `name` (checked against the server's ped position).
---@param name any
function BridgeVRP.tunnel.enterArea(name)
    local src = source
    local list = areas[src]
    local area = type(name) == 'string' and list and list[name]
    if not area or area.inside then return end
    local coords = GetEntityCoords(GetPlayerPed(src))
    local dx, dy = coords.x - area.x, coords.y - area.y
    if math.sqrt(dx * dx + dy * dy) > area.radius + TOLERANCE or math.abs(coords.z - area.z) > area.height + TOLERANCE then return end
    area.inside = true
    BridgeVRP.call(area.enter, src, name)
end

--- Client report: the ped left `name`.
---@param name any
function BridgeVRP.tunnel.leaveArea(name)
    local src = source
    local list = areas[src]
    local area = type(name) == 'string' and list and list[name]
    if area then leave(src, name, area) end
end

-- The areas of a character go when it is let go (vRP: on leave), with their leave callbacks.
Bridge.on('unloaded', function(source)
    local list = areas[source]
    areas[source] = nil
    if not list then return end
    for name, area in pairs(list) do leave(source, name, area) end
end)

AddEventHandler('playerDropped', function()
    areas[source] = nil
end)

AddEventHandler('onResourceStop', function(resource)
    for source, list in pairs(areas) do
        for name, area in pairs(list) do
            if area.owner == resource then
                list[name] = nil
                BridgeVRP.client._removeArea(source, name)
            end
        end
    end
end)
