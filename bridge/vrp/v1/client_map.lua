-- vRP 1 client API on ai-core, map: blips, GPS, markers and areas (vRP 1.0 `vrp/client/map.lua`; vRP 2 `vRP.EXT.Map`).
-- Markers are drawn only while one is within its visible distance; areas are lib zones reported to the server
-- (bridge/vrp/v1/map.lua checks them again).

local tvRP = BridgeVRPClient.tvRP

-- Blips -------------------------------------------------------------------------------------------------------------

--- Adds a short range blip; returns its handle (vRP scripts keep it for removeBlip / setBlipRoute).
---@param x any
---@param y any
---@param z any
---@param idtype any sprite
---@param idcolor any colour
---@param text any
---@return integer|nil
function tvRP.addBlip(x, y, z, idtype, idcolor, text)
    x, y, z = tonumber(x), tonumber(y), tonumber(z)
    if not (x and y and z) then return nil end
    return aiLib.Blips.create({
        coords = vector3(x, y, z),
        sprite = math.floor(tonumber(idtype) or 1),
        color = math.floor(tonumber(idcolor) or 0),
        label = text ~= nil and aiLib.stripGameText(text) or nil,
    })
end

---@param id any blip handle
function tvRP.removeBlip(id)
    id = tonumber(id)
    if id and DoesBlipExist(id) then RemoveBlip(id) end
end

---@type table<string, integer>
local namedBlips = {}

--- Adds or replaces the blip named `name`; returns its handle.
---@param name any
---@return integer|nil
function tvRP.setNamedBlip(name, x, y, z, idtype, idcolor, text)
    if name == nil then return nil end
    tvRP.removeNamedBlip(name)
    local blip = tvRP.addBlip(x, y, z, idtype, idcolor, text)
    namedBlips[tostring(name)] = blip
    return blip
end

---@param name any
function tvRP.removeNamedBlip(name)
    local key = tostring(name)
    local blip = namedBlips[key]
    if not blip then return end
    namedBlips[key] = nil
    tvRP.removeBlip(blip)
end

--- Sets the map waypoint.
---@param x any
---@param y any
function tvRP.setGPS(x, y)
    x, y = tonumber(x), tonumber(y)
    if x and y then SetNewWaypoint(x + 0.0, y + 0.0) end
end

---@param id any blip handle
function tvRP.setBlipRoute(id)
    id = tonumber(id)
    if id and DoesBlipExist(id) then SetBlipRoute(id, true) end
end

-- Markers -----------------------------------------------------------------------------------------------------------

---@class VrpMarker
---@field pos vector3
---@field sx number
---@field sy number
---@field sz number
---@field r integer
---@field g integer
---@field b integer
---@field a integer
---@field visible number

---@type table<integer, VrpMarker> markers within their visible distance (drawn every frame)
local shown = {}
local nextMarker = 0
local markerZones = aiLib.Zones.new()

local drawJob = aiLib.every(0, function()
    for _, m in pairs(shown) do
        DrawMarker(1, m.pos.x, m.pos.y, m.pos.z, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, m.sx, m.sy, m.sz, m.r, m.g, m.b, m.a, false, false, 2, false, nil, nil, false)
    end
end, { active = false, name = 'vrp markers' })

--- Adds a cylinder marker drawn within `visible_distance` (150 m); returns its id.
---@return integer|nil
function tvRP.addMarker(x, y, z, sx, sy, sz, r, g, b, a, visible_distance)
    x, y, z = tonumber(x), tonumber(y), tonumber(z)
    if not (x and y and z) then return nil end
    nextMarker = nextMarker + 1
    local id = nextMarker
    ---@type VrpMarker
    local marker = {
        pos = vector3(x, y, z),
        sx = (tonumber(sx) or 2.0) + 0.0, sy = (tonumber(sy) or 2.0) + 0.0, sz = (tonumber(sz) or 0.7) + 0.0,
        r = math.floor(tonumber(r) or 0), g = math.floor(tonumber(g) or 155), b = math.floor(tonumber(b) or 255),
        a = math.floor(tonumber(a) or 200), visible = tonumber(visible_distance) or 150,
    }
    markerZones:add(tostring(id), {
        shape = { type = 'sphere', center = marker.pos, radius = marker.visible },
        onEnter = function()
            shown[id] = marker
            drawJob:set(true)
        end,
        onExit = function()
            shown[id] = nil
            if next(shown) == nil then drawJob:set(false) end
        end,
    })
    return id
end

---@param id any
function tvRP.removeMarker(id)
    id = tonumber(id)
    if id then markerZones:remove(tostring(id)) end
end

---@type table<string, integer>
local namedMarkers = {}

--- Adds or replaces the marker named `name`; returns its id.
---@param name any
---@return integer|nil
function tvRP.setNamedMarker(name, x, y, z, sx, sy, sz, r, g, b, a, visible_distance)
    if name == nil then return nil end
    tvRP.removeNamedMarker(name)
    local id = tvRP.addMarker(x, y, z, sx, sy, sz, r, g, b, a, visible_distance)
    namedMarkers[tostring(name)] = id
    return id
end

---@param name any
function tvRP.removeNamedMarker(name)
    local key = tostring(name)
    local id = namedMarkers[key]
    if not id then return end
    namedMarkers[key] = nil
    tvRP.removeMarker(id)
end

-- Areas (server: bridge/vrp/v1/map.lua) ------------------------------------------------------------------------------

local zones = aiLib.Zones.new()
---@type table<string, string> name -> the area's values, so a repeated setArea keeps the zone (no leave + enter)
local areaKeys = {}

--- Server only (vRP.setArea): watches a cylinder area (every 250 ms) and reports enter / leave to the server.
---@param name any
function tvRP.setArea(name, x, y, z, radius, height)
    x, y, z, radius = tonumber(x), tonumber(y), tonumber(z), tonumber(radius)
    if type(name) ~= 'string' or not (x and y and z and radius) then return end
    height = tonumber(height) or 6
    local key = ('%s:%s:%s:%s:%s'):format(x, y, z, radius, height)
    if areaKeys[name] == key then return end
    areaKeys[name] = key
    zones:add(name, {
        shape = { type = 'cylinder', center = vector3(x, y, z), radius = radius, height = height },
        interval = 250,
        onEnter = function() BridgeVRPClient.server._enterArea(name) end,
        onExit = function() BridgeVRPClient.server._leaveArea(name) end,
    })
end

---@param name any
function tvRP.removeArea(name)
    if type(name) ~= 'string' then return end
    areaKeys[name] = nil
    zones:remove(name)
end

-- A character switch drops the areas (the server drops its side on unload).
BridgeClient.on('unloaded', function()
    areaKeys = {}
    zones:clear()
end)
