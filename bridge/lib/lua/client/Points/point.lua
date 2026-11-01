-- One point of `Points` (lua/client/Points.lua): its prompt, its target option and its area. Returns the `Point`
-- class and the style one point uses.

local resource = GetCurrentResourceName()
local targets = aiLib.targets
local busy = false

---The style one point uses: the owner's, unless the point asks for its own (`promptOnly`, `preferTarget`).
---@param options { promptOnly?: boolean, preferTarget?: boolean }
---@param mode 'prompt'|'target'
---@return 'prompt'|'target'
local function pointStyle(options, mode)
    if options.promptOnly then return 'prompt' end
    if options.preferTarget and targets.active() ~= nil then return 'target' end
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
---@field registration table? the target option while the point is on a target
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

---@return AiLibTargetOption
function Point:targetOption()
    return {
        name = resource .. ':' .. self.promptId,
        label = readLabel(self.options.label),
        icon = self.options.icon,
        distance = self.options.radius or 2,
        canInteract = function() return self:allowed() end,
        onSelect = function() self:press() end,
    }
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

return Point, pointStyle
