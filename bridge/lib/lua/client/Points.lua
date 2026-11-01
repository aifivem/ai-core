-- Interaction points of a resource (counters, doors, NPC spots): ai-core's prompt (its interaction key) or a target
-- option, as the owner picks in ai-core's panel (Interaction); the same `onPressed` runs either way.

local resource = GetCurrentResourceName()
local targets = aiLib.targets
-- One point (prompt, target option, area): lua/client/Points/point.lua.
local Point, pointStyle = aiLib.loadPart('Points/point')
local CHECK_MS = 500
local groups = {}
local byPrompt = {}
local nextGroup = 0
---@type AiLibJob
local watcher

---@return 'prompt'|'target'
local function style()
    return GlobalState['ai:interaction'] == 'target' and targets.active() ~= nil and 'target' or 'prompt'
end

---@class AiLibPoints
---@field private prefix string
---@field private points table<string, AiLibPoint>
---@field private models table<string, table>
local Points = {}
Points.__index = Points

---A new group of points; `clear()` + `add()` rebuilds it when its data changes.
---@return AiLibPoints
function Points.new()
    nextGroup = nextGroup + 1
    local self = setmetatable({ prefix = ('pt%d:'):format(nextGroup), points = {}, models = {} }, Points)
    groups[#groups + 1] = self
    return self
end

---Adds (or replaces) a point.
---@param id string
---@param options AiLibPointOptions
function Points:add(id, options)
    self:remove(id)
    local point = setmetatable({ promptId = self.prefix .. id, options = options, inside = false }, Point)
    self.points[id] = point
    byPrompt[point.promptId] = point
    watcher:set(true)
    local b = options.blip
    if b then
        point.blip = aiLib.Blips.create({
            coords = b.coords or options.coords,
            sprite = b.sprite,
            color = b.color,
            scale = b.scale,
            label = b.label,
        })
    end
    local ped = options.ped
    if ped then
        local c = options.coords
        point.ped = aiLib.LocalPed.new({
            model = ped.model,
            coords = ped.coords or { x = c.x, y = c.y, z = c.z, w = 0.0 },
            scenario = ped.scenario,
            anim = ped.anim,
            distance = ped.distance,
            onSpawn = function() self:attach(point, style()) end,
            onDespawn = function() self:detach(point) end,
        })
    end
    self:attach(point, style())
end

---@param id string
function Points:remove(id)
    local point = self.points[id]
    if not point then return end
    self.points[id] = nil
    byPrompt[point.promptId] = nil
    self:detach(point)
    if point.shown then exports['ai-lib']:HidePrompt(point.promptId) end
    if point.blip then RemoveBlip(point.blip) end
    if point.ped then point.ped:remove() end
    local model = self.models[id]
    if model then
        self.models[id] = nil
        aiLib.ModelPoints.remove(model)
    end
end

function Points:clear()
    for id in pairs(self.points) do self:remove(id) end
    for id in pairs(self.models) do self:remove(id) end
end

---A point on every world object of some models (ATMs, chairs; `vehicles = true` for vehicle models such as boats):
---a target option on the models, or a prompt near the closest one. `canShow` and `onPressed` get the entity.
---@param id string
---@param options { models: (string|integer)[], vehicles?: boolean, inVehicle?: boolean, label: string, icon?: string, radius?: number, canShow?: fun(entity: integer): boolean, onPressed: fun(entity: integer) }
function Points:addModel(id, options)
    self:remove(id)
    self.models[id] = aiLib.ModelPoints.add(self.prefix .. id, options, style())
end

---A point on every vehicle (trunk, hood, push): ox_target's global vehicle option, or a prompt at the nearest
---networked vehicle within `radius` (default 1.5). `canShow` and `onPressed` get the vehicle.
---@param id string
---@param options { label: string, icon?: string, radius?: number, canShow?: fun(vehicle: integer): boolean, onPressed: fun(vehicle: integer) }
function Points:addVehicle(id, options)
    local o = { models = {}, vehicles = true }
    for k, v in pairs(options) do o[k] = v end
    self:addModel(id, o)
end

---Reads `canShow` and function labels again (call when what they read changed: job, duty, vehicle).
function Points:refresh()
    local mode = style()
    for _, point in pairs(self.points) do
        if point.registration then
            self:detach(point)
            self:attach(point, mode)
        end
        point:sync(mode)
    end
end

---@private
function Points:attach(point, mode)
    local target = targets.active()
    if not target or point.registration or pointStyle(point.options, mode) ~= 'target' then return end
    local option = point:targetOption()
    if point.ped then
        local ped = point.ped.entity
        if ped ~= 0 then
            point.registration = targets.register(target,
                function(a) a.addLocalEntity(ped, option) end,
                function(a) a.removeLocalEntity(ped, option) end)
        end
        return
    end
    local coords, radius = point.options.coords, point.options.targetRadius or 1
    point.registration = targets.register(target,
        function(a) return a.addSphere(coords, radius, option) end,
        function(a, handle) a.removeZone(handle, option) end)
end

---@private
function Points:detach(point)
    targets.unregister(point.registration)
    point.registration = nil
end

local function restyleAll()
    local mode = style()
    for _, group in ipairs(groups) do
        for _, point in pairs(group.points) do
            group:detach(point)
            group:attach(point, mode)
            point:sync(mode)
        end
        for _, model in pairs(group.models) do aiLib.ModelPoints.restyle(model, mode) end
    end
end

-- One check for every point of this resource, two times a second (a scheduler job running while points exist);
-- enters and exits run whatever the style.
watcher = aiLib.every(CHECK_MS, function()
    local any = false
    local x, y, z = table.unpack(GetEntityCoords(aiLib.cache.ped))
    local mode = style()
    for _, group in ipairs(groups) do
        for _, point in pairs(group.points) do
            any = true
            local inside = point:contains(x, y, z)
            if inside ~= point.inside then
                point.inside = inside
                local hook = inside and point.options.onEnter or point.options.onExit
                if hook then pcall(hook) end
            end
            if point.inside or point.shown then point:sync(mode) end
        end
    end
    if not any then watcher:set(false) end
end, { active = false, name = 'points' })

AddEventHandler('ai-lib:client:promptPressed', function(owner, id)
    if owner ~= resource then return end
    local point = byPrompt[id]
    if point then point:press() else aiLib.ModelPoints.press(id) end
end)
AddStateBagChangeHandler('ai:interaction', 'global', function() SetTimeout(0, restyleAll) end)
targets.onChange(restyleAll)

return Points
