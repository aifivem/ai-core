-- Interaction points of a resource (counters, doors, NPC spots): ai-core's prompt (its interaction key) or a target
-- option, as the owner picks in ai-core's panel (Interaction); the same `onPressed` runs either way.

local resource = GetCurrentResourceName()
local TARGET = 'ox_target'
---The resource answering the ox_target API: ai-target `provide`s it, but a provided name is not always reported started.
---@return string?
local function targetResource()
    if GetResourceState(TARGET) == 'started' then return TARGET end
    if GetResourceState('ai-target') == 'started' then return 'ai-target' end
end
local CHECK_MS = 500
local groups = {}
local byPrompt = {}
local nextGroup = 0
local busy = false
---@type AiLibJob
local watcher

---@return 'prompt'|'target'
local function style()
    return GlobalState['ai:interaction'] == 'target' and targetResource() ~= nil and 'target' or 'prompt'
end

---The style one point uses: the owner's, unless the point asks for its own (`promptOnly`, `preferTarget`).
---@param options { promptOnly?: boolean, preferTarget?: boolean }
---@param mode 'prompt'|'target'
---@return 'prompt'|'target'
local function pointStyle(options, mode)
    if options.promptOnly then return 'prompt' end
    if options.preferTarget and targetResource() ~= nil then return 'target' end
    return mode
end

---@param value string|fun(): string
local function readLabel(value)
    if type(value) ~= 'function' then return value end
    local ok, text = pcall(value)
    return ok and text or ''
end

---@class AiLibPointOptions
---@field coords vector3|{x: number, y: number, z: number}
---@field label string|fun(): string prompt text or target label (already translated)
---@field icon? string Font Awesome name (`store` or `fa-solid fa-store`)
---@field radius? number metres (default 2)
---@field height? number a cylinder: metres up and down from `coords`
---@field targetRadius? number target mode: size of the aim spot (default 1)
---@field promptOnly? boolean always a prompt (actions done from a vehicle)
---@field preferTarget? boolean a target option whenever a target resource runs, whatever the owner picked (seats)
---@field world? boolean|fun(): vector3 as a prompt: drawn over `coords` (or the point the function gives when it shows) in the world instead of the right-hand list (doors)
---@field canShow? fun(): boolean
---@field onPressed fun()
---@field onEnter? fun()
---@field onExit? fun()
---@field blip? { sprite: integer, color: integer, scale?: number, label?: string, coords?: vector3 } a map blip (its label = the place's name)
---@field ped? { model: string, coords?: vector4, scenario?: string, anim?: { dict: string, clip: string }, distance?: number } an NPC at the point; target options go on it

---@class AiLibPoint
---@field promptId string
---@field options AiLibPointOptions
---@field inside boolean
---@field shown string?
---@field zone any
---@field blip integer?
---@field ped AiLibLocalPed?
local Point = {}
Point.__index = Point

function Point:allowed()
    if not self.options.canShow then return true end
    local ok, result = pcall(self.options.canShow)
    return ok and result ~= false
end

function Point:press()
    if busy or not self:allowed() then return end
    busy = true
    local ok, err = pcall(self.options.onPressed)
    busy = false
    if not ok then print(('^1[%s] point onPressed failed: %s^0'):format(resource, err)) end
end

---@param mode 'prompt'|'target'
function Point:sync(mode)
    mode = pointStyle(self.options, mode)
    local text = mode == 'prompt' and self.inside and self:allowed() and readLabel(self.options.label) or nil
    if text == self.shown then return end
    self.shown = text
    if not text then return exports['ai-lib']:HidePrompt(self.promptId) end
    local world, c = self.options.world, self.options.coords
    if type(world) == 'function' then c = world() end
    exports['ai-lib']:ShowPrompt(self.promptId, text, world and { x = c.x, y = c.y, z = c.z } or nil)
end

function Point:targetOption()
    return { {
        name = self.promptId,
        label = readLabel(self.options.label),
        icon = self.options.icon,
        distance = self.options.radius or 2,
        canInteract = function() return self:allowed() end,
        onSelect = function() self:press() end,
    } }
end

---@param x number
---@param y number
---@param z number
function Point:contains(x, y, z)
    local c = self.options.coords
    local r = self.options.radius or 2
    if self.options.height then
        return (x - c.x) ^ 2 + (y - c.y) ^ 2 <= r * r and math.abs(z - c.z) <= self.options.height
    end
    return (x - c.x) ^ 2 + (y - c.y) ^ 2 + (z - c.z) ^ 2 <= r * r
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
            onSpawn = function(entity)
                if pointStyle(options, style()) == 'target' then
                    exports[targetResource() or TARGET]:addLocalEntity(entity, point:targetOption())
                end
            end,
            onDespawn = function(entity)
                if targetResource() ~= nil then exports[targetResource() or TARGET]:removeLocalEntity(entity, point.promptId) end
            end,
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
        if pointStyle(point.options, mode) == 'target' and point.zone then
            self:detach(point)
            self:attach(point, mode)
        end
        point:sync(mode)
    end
end

---@private
function Points:attach(point, mode)
    if pointStyle(point.options, mode) ~= 'target' then return end
    if point.ped then
        if point.ped.entity ~= 0 then exports[targetResource() or TARGET]:addLocalEntity(point.ped.entity, point:targetOption()) end
        return
    end
    point.zone = exports[targetResource() or TARGET]:addSphereZone({
        coords = point.options.coords,
        radius = point.options.targetRadius or 1,
        options = point:targetOption(),
    })
end

---@private
function Points:detach(point)
    if targetResource() == nil then
        point.zone = nil
        return
    end
    if point.zone then exports[targetResource() or TARGET]:removeZone(point.zone) end
    point.zone = nil
    if point.ped and point.ped.entity ~= 0 then exports[targetResource() or TARGET]:removeLocalEntity(point.ped.entity, point.promptId) end
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
AddEventHandler('onClientResourceStart', function(name)
    if name == TARGET or name == 'ai-target' then SetTimeout(0, restyleAll) end
end)
AddEventHandler('onClientResourceStop', function(name)
    if name == TARGET or name == 'ai-target' then SetTimeout(0, restyleAll) end
end)

return Points
