-- ESX on ai-core, server side: ESX's extended vehicles, the owned vehicle object on ai-vehicles (owner = the
-- citizenid of a loaded character).

---@class CExtendedVehicle
---@field plate string

---@type table<string, { id: integer, entity: integer, netId: integer, model: integer, owner: string }>
local spawned = {}

---@return table|nil
local function vehicles()
    return GetResourceState('ai-vehicles') == 'started' and exports['ai-vehicles'] or nil
end

---@param citizenid string
---@return integer|nil charId of a loaded character
local function charIdOf(citizenid)
    local source = Bridge.sourceByCitizenId(citizenid)
    local mirror = source and Bridge.players[source]
    return mirror and mirror.character.id or nil
end

---@param plate string
---@return CExtendedVehicle
local function vehicleObject(plate)
    local obj = { plate = plate }
    function obj.isValid(self) local v = spawned[self.plate] return v ~= nil and DoesEntityExist(v.entity) end
    function obj.getPlate(self) return spawned[self.plate] and self.plate or nil end
    function obj.getNetId(self) return spawned[self.plate] and spawned[self.plate].netId or nil end
    function obj.getEntity(self) return spawned[self.plate] and spawned[self.plate].entity or nil end
    function obj.getModelHash(self) return spawned[self.plate] and spawned[self.plate].model or nil end
    function obj.getOwner(self) return spawned[self.plate] and spawned[self.plate].owner or nil end
    --- ai-vehicles keeps a vehicle's plate: it is not changed.
    function obj.setPlate() return false end
    function obj.setProps(self, props)
        local v, api = spawned[self.plate], vehicles()
        if not v or not api or type(props) ~= 'table' then return false end
        api:SaveVehicle(v.id, { props = props })
        return true
    end
    function obj.setOwner(self, newOwner)
        local v, api = spawned[self.plate], vehicles()
        local charId = type(newOwner) == 'string' and charIdOf(newOwner)
        if not v or not api or not charId then return false end
        api:SetOwner(v.id, { type = 'character', id = tostring(charId) })
        v.owner = newOwner
        return true
    end
    function obj.delete(self, garageName, isImpound)
        local v, api = spawned[self.plate], vehicles()
        if not v then return end
        spawned[self.plate] = nil
        if api then api:StoreVehicle(v.id, type(garageName) == 'string' and garageName or nil, isImpound and 'impound' or 'garage') end
        if DoesEntityExist(v.entity) then DeleteEntity(v.entity) end
    end
    return obj --[[@as CExtendedVehicle]]
end

--- Takes a stored vehicle of `owner` (citizenid of a loaded character) out of its garage at `coords`. Waits.
---@param owner string
---@param plate string
---@param coords vector4
---@return CExtendedVehicle|nil
function ESX.CreateExtendedVehicle(owner, plate, coords)
    assert(type(owner) == 'string', "Expected 'owner' to be a string")
    assert(type(plate) == 'string', "Expected 'plate' to be a string")
    if spawned[plate] then return ESX.GetExtendedVehicleFromPlate(plate) end
    local api, charId = vehicles(), charIdOf(owner)
    if not api or not charId then return nil end
    local vehicle = api:GetVehicle(plate)
    if not vehicle or vehicle.state ~= 'garage' or vehicle.owner.type ~= 'character' or vehicle.owner.id ~= tostring(charId) then return nil end
    local done = promise.new()
    api:SpawnVehicle(vehicle.id, { x = coords.x, y = coords.y, z = coords.z, heading = coords.w or 0.0 }, Bridge.sourceByCitizenId(owner), function(netId) done:resolve(netId) end)
    local netId = Citizen.Await(done)
    local entity = netId and NetworkGetEntityFromNetworkId(netId) or 0
    if entity == 0 then return nil end
    Entity(entity).state:set('owner', owner, false)
    Entity(entity).state:set('plate', plate, false)
    spawned[plate] = { id = vehicle.id, entity = entity, netId = netId, model = joaat(vehicle.model), owner = owner }
    local obj = vehicleObject(plate)
    TriggerEvent('esx:createdExtendedVehicle', obj)
    return obj
end

---@param plate string
---@return CExtendedVehicle|nil
function ESX.GetExtendedVehicleFromPlate(plate)
    assert(type(plate) == 'string', "Expected 'plate' to be a string")
    local v = spawned[plate]
    if not v then return nil end
    if not DoesEntityExist(v.entity) then
        spawned[plate] = nil
        return nil
    end
    return vehicleObject(plate)
end
