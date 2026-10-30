-- A ped only this client sees (a shopkeeper, a job NPC), like the TypeScript lib's `LocalPed`: created when the player
-- comes near, deleted when they leave, frozen, invincible and deaf to events. Never networked.

local zones
local nextId = 0

---@class AiLibLocalPedOptions
---@field model string
---@field coords vector4|{x: number, y: number, z: number, w?: number, heading?: number}
---@field ground? boolean `coords.z` is the floor (default true)
---@field scenario? string
---@field anim? { dict: string, clip: string }
---@field distance? number spawned within this many metres (default 50)
---@field attach? { entity: integer|(fun(): integer), bone?: integer, offset?: vector3|{x: number, y: number, z: number}, rotation?: vector3|{x: number, y: number, z: number} } attached at a bone (not frozen); a function is read at each spawn
---@field seat? { vehicle: integer|(fun(): integer), seat: integer } sitting in a vehicle seat (-1 driver); a function is read at each spawn
---@field onSpawn? fun(ped: integer)
---@field onDespawn? fun(ped: integer)

---@class AiLibLocalPed
---@field entity integer the ped while it exists, else 0
---@field private id string
---@field private options AiLibLocalPedOptions
---@field private wanted boolean
local LocalPed = {}
LocalPed.__index = LocalPed

---@param options AiLibLocalPedOptions
---@return AiLibLocalPed
function LocalPed.new(options)
    zones = zones or aiLib.Zones.new()
    nextId = nextId + 1
    local self = setmetatable({ id = ('ped:%d'):format(nextId), entity = 0, options = options, wanted = false }, LocalPed)
    local c = options.coords
    zones:add(self.id, {
        shape = { type = 'sphere', center = { x = c.x, y = c.y, z = c.z }, radius = options.distance or 50 },
        interval = 1000,
        onEnter = function() CreateThread(function() self:spawn() end) end,
        onExit = function() self:despawn() end,
    })
    return self
end

---Deletes the ped for good.
function LocalPed:remove()
    zones:remove(self.id)
    self:despawn()
end

---@private
function LocalPed:spawn()
    self.wanted = true
    local o = self.options
    local hash = aiLib.requestModel(o.model)
    if not hash then return print(('^1[%s] local ped model %s does not load^0'):format(GetCurrentResourceName(), o.model)) end
    if o.anim then aiLib.requestAnimDict(o.anim.dict) end
    -- The player may have left while the model loaded.
    if not self.wanted or self.entity ~= 0 then return SetModelAsNoLongerNeeded(hash) end
    local c = o.coords
    local ped = CreatePed(4, hash, c.x, c.y, o.ground == false and c.z or c.z - 1.0, c.w or c.heading or 0.0, false, false)
    SetModelAsNoLongerNeeded(hash)
    if not self:place(ped) then FreezeEntityPosition(ped, true) end
    SetEntityInvincible(ped, true)
    SetBlockingOfNonTemporaryEvents(ped, true)
    SetPedCanRagdoll(ped, false)
    if o.scenario then
        TaskStartScenarioInPlace(ped, o.scenario, 0, true)
    elseif o.anim then
        TaskPlayAnim(ped, o.anim.dict, o.anim.clip, 8.0, 8.0, -1, 1, 0, false, false, false)
    end
    self.entity = ped
    if o.onSpawn then pcall(o.onSpawn, ped) end
end

---Puts the new ped into its seat or attaches it; false when it stands free (no target entity right now).
---@private
---@param ped integer
---@return boolean
function LocalPed:place(ped)
    local o = self.options
    local function read(e) if type(e) == 'function' then return e() end return e end
    if o.seat then
        local vehicle = read(o.seat.vehicle)
        if not vehicle or vehicle == 0 or not DoesEntityExist(vehicle) then return false end
        SetPedIntoVehicle(ped, vehicle, o.seat.seat)
        return true
    end
    if not o.attach then return false end
    local entity = read(o.attach.entity)
    if not entity or entity == 0 or not DoesEntityExist(entity) then return false end
    local off = o.attach.offset or { x = 0.0, y = 0.0, z = 0.0 }
    local rot = o.attach.rotation or { x = 0.0, y = 0.0, z = 0.0 }
    AttachEntityToEntity(ped, entity, o.attach.bone or 0, off.x, off.y, off.z, rot.x, rot.y, rot.z, false, false, false, false, 2, true)
    return true
end

---@private
function LocalPed:despawn()
    self.wanted = false
    if self.entity == 0 then return end
    local ped = self.entity
    self.entity = 0
    if self.options.onDespawn then pcall(self.options.onDespawn, ped) end
    if DoesEntityExist(ped) then DeletePed(ped) end
end

return LocalPed
