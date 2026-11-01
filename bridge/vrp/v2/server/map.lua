local V = BridgeVRP2
local vRP = V.vRP
local run, v1, coreExtension = V.run, V.v1, V.coreExtension

-- Map: player areas through vRP 1 `setArea` (the client reports, the server checks the ped position).
local MapUser = {}

function MapUser:__construct()
    self.map_areas = {}
end

--- `cb_enter(user, name)` / `cb_leave(user, name)` when the player enters / leaves the area.
---@param name any
---@param x any
---@param y any
---@param z any
---@param radius any
---@param height any
---@param cb_enter any
---@param cb_leave any
function MapUser:setArea(name, x, y, z, radius, height, cb_enter, cb_leave)
    if type(name) ~= 'string' then return end
    local owner = V.owner()
    local area = { enter = cb_enter, leave = cb_leave, inside = false }
    self.map_areas[name] = area
    local function relay(fn, inside)
        return function()
            if self.map_areas[name] ~= area then return end
            area.inside = inside
            if type(fn) == 'function' then run(owner, fn, self, name) end
        end
    end
    v1('setArea', nil, self.source, name, x, y, z, radius, height, relay(cb_enter, true), relay(cb_leave, false))
end

---@param name any
function MapUser:removeArea(name)
    if type(name) ~= 'string' or not self.map_areas[name] then return end
    v1('removeArea', nil, self.source, name)
    self.map_areas[name] = nil
end

---@param name any
---@return boolean|nil
function MapUser:inArea(name)
    local area = self.map_areas[name]
    return area and area.inside or nil
end

coreExtension('Map', { cfg = { entities = {} } }, nil, MapUser)

-- Mission: steps the player walks through (a GPS route to each step, the step text as a notification, `onenter` /
-- `onleave` of the step's area).
local MissionUser = {}

--- `mission = { name, steps = { { text, position = { x, y, z }, radius?, height?, onenter?, onleave? } } }`.
---@param mission any
function MissionUser:startMission(mission)
    self:stopMission()
    if type(mission) ~= 'table' or type(mission.steps) ~= 'table' or #mission.steps == 0 then return end
    self.mission_step = 0
    self.mission = mission
    vRP:triggerEvent('playerMissionStart', self)
    self:nextMissionStep()
end

function MissionUser:nextMissionStep()
    local mission = self.mission
    if not mission then return end
    self.mission_step = self.mission_step + 1
    if self.mission_step > #mission.steps then return self:stopMission() end
    local step = mission.steps[self.mission_step]
    local position = type(step.position) == 'table' and step.position or {}
    local x, y, z = tonumber(position[1]), tonumber(position[2]), tonumber(position[3])
    vRP:triggerEvent('playerMissionStep', self)
    if not (x and y and z) then return end
    local text = aiLib.stripGameText(('%s (%d/%d): %s'):format(tostring(mission.name or ''), self.mission_step,
        #mission.steps, tostring(step.text or '')))
    Bridge.notify(self.source, text, 'info', 10000)
    BridgeVRP.client._setGPS(self.source, x, y)
    self:setArea('vRP:mission', x, y, z, step.radius or 1, step.height or 1.5, step.onenter, step.onleave)
end

function MissionUser:stopMission()
    if not self.mission then return end
    self:removeArea('vRP:mission')
    vRP:triggerEvent('playerMissionStop', self)
    self.mission_step = nil
    self.mission = nil
end

---@return boolean
function MissionUser:hasMission()
    return self.mission ~= nil
end

coreExtension('Mission', { cfg = {} }, {
    characterUnload = function(_, user) user:stopMission() end,
}, MissionUser)

-- PlayerState: the client functions (`remote.getWeapons` / `giveWeapons` go through the inventory, as vRP 1's).
coreExtension('PlayerState', { cfg = {} })
