-- Map blips of a resource, like the TypeScript lib's `Blips` / `createBlip`: named, short range by default.

local LABEL = ('AI_BLIP_%s'):format(GetCurrentResourceName())
AddTextEntry(LABEL, '~a~')

---@class AiLibBlipOptions
---@field coords vector3|{x: number, y: number, z: number}
---@field sprite integer
---@field color integer
---@field scale? number default 0.8
---@field label? string the map name (already translated)
---@field shortRange? boolean only on the minimap when close (default true)
---@field display? integer SetBlipDisplay (default 4)

---Creates a named blip and returns its handle (RemoveBlip it, or use a `Blips` group).
---@param options AiLibBlipOptions
---@return integer
local function createBlip(options)
    local c = options.coords
    local blip = AddBlipForCoord(c.x, c.y, c.z)
    SetBlipSprite(blip, options.sprite)
    SetBlipColour(blip, options.color)
    SetBlipScale(blip, options.scale or 0.8)
    SetBlipDisplay(blip, options.display or 4)
    SetBlipAsShortRange(blip, options.shortRange ~= false)
    if options.label then
        BeginTextCommandSetBlipName(LABEL)
        AddTextComponentSubstringPlayerName(options.label)
        EndTextCommandSetBlipName(blip)
    end
    return blip
end

---@class AiLibBlips
---@field private blips table<string, integer>
local Blips = { create = createBlip }
Blips.__index = Blips

---A group of blips by id (`clear()` removes them all).
---@return AiLibBlips
function Blips.new()
    return setmetatable({ blips = {} }, Blips)
end

---Adds (or replaces) a blip and returns its handle.
---@param id string
---@param options AiLibBlipOptions
---@return integer
function Blips:add(id, options)
    self:remove(id)
    local blip = createBlip(options)
    self.blips[id] = blip
    return blip
end

---@param id string
---@return integer?
function Blips:get(id)
    return self.blips[id]
end

---@param id string
function Blips:remove(id)
    local blip = self.blips[id]
    if blip then RemoveBlip(blip) end
    self.blips[id] = nil
end

function Blips:clear()
    for id in pairs(self.blips) do self:remove(id) end
end

return Blips
