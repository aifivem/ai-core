-- ESX on ai-core, server side: ESX.OneSync (entities and players in an area, server spawns), ESX.GetVehicleType and
-- ESX's extended vehicles (owned vehicles of ai-vehicles). Loaded after bridge/esx/server.lua.

local VEHICLE_TYPES = { automobile = true, bike = true, boat = true, heli = true, plane = true, submarine = true, trailer = true, train = true }

--- Model hash -> { name, type } of the vehicles every server knows (qbx_core's shared vehicle list), built once.
---@type table<integer, { name: string, type: string }>|nil
local byHash

---@return table<integer, { name: string, type: string }>
local function knownVehicles()
    if byHash then return byHash end
    byHash = {}
    for name, vehicle in pairs(BridgeShapes.sharedData('vehicles')) do
        local model = type(vehicle.model) == 'string' and vehicle.model or name
        byHash[joaat(model)] = { name = model, type = vehicle.type }
    end
    return byHash
end

---@param cb any
---@return boolean
local function callable(cb) return cb ~= nil and cb ~= false and ESX.IsFunctionReference(cb) end

--- Runs `work` and hands its result to `cb` (in a thread), or returns it (the caller waits in its own thread).
---@param cb any
---@param work fun(): any
---@return any
local function answer(cb, work)
    if callable(cb) then
        CreateThread(function() cb(work() or false) end)
        return nil
    end
    return work()
end

---@param x any
---@return boolean
local function finite(x) return type(x) == 'number' and x == x and x ~= math.huge and x ~= -math.huge end

--- A vehicle model's `CreateVehicleServerSetter` type: the shared vehicle list, then a player's client through ai-lib's
--- `vehicleType` (model name or hash; kept for everyone once two players' clients agree). `cb` or a return value (waits).
---@param model string|integer
---@param player? integer|function
---@param cb? any
---@return string|nil
function ESX.GetVehicleType(model, player, cb)
    if callable(player) and cb == nil then cb, player = player, nil end
    return answer(cb, function()
        if type(model) ~= 'string' and math.type(model) ~= 'integer' then return nil end
        local known = knownVehicles()[type(model) == 'string' and joaat(model) or model]
        if known and VEHICLE_TYPES[known.type] then return known.type end
        local asker = math.tointeger(player)
        if not asker or not Bridge.players[asker] then return nil end
        return (aiLib.vehicleType(model, asker))
    end)
end

---@param entity integer
---@return integer|nil
local function netIdOf(entity)
    if not entity or entity == 0 or not DoesEntityExist(entity) then return nil end
    return NetworkGetNetworkIdFromEntity(entity)
end

--- Spawns a server vehicle through ai-lib's `spawnVehicle` and returns its net id (`cb(netId)` when given). ESX's
--- `VehicleProperties` state bag carries `props` for clients that apply ESX props.
---@param vehicleModel string|integer
---@param coords vector3|vector4|{ x: number, y: number, z: number }
---@param heading number
---@param vehicleProperties? table
---@param cb? fun(netId: integer|false)|string
---@param vehicleType? string
---@return integer|nil netId
function ESX.OneSync.SpawnVehicle(vehicleModel, coords, heading, vehicleProperties, cb, vehicleType)
    if type(cb) == 'string' and vehicleType == nil then vehicleType, cb = cb, nil end
    return answer(cb, function()
        local kind = vehicleType or ESX.GetVehicleType(vehicleModel, next(Bridge.players))
        if not kind then
            print(('[^3WARNING^7] Could not resolve the type of vehicle ^5%s^7.'):format(tostring(vehicleModel)))
            return nil
        end
        local props = type(vehicleProperties) == 'table' and vehicleProperties or {}
        local at = { x = coords.x, y = coords.y, z = coords.z, w = finite(heading) and heading or 0.0 }
        local entity = aiLib.spawnVehicle({ model = vehicleModel, coords = at, type = kind, plate = type(props.plate) == 'string' and props.plate or nil, bags = { VehicleProperties = props } })
        return entity and netIdOf(entity) or nil
    end)
end

---@param model string|integer
---@param coords vector3|{ x: number, y: number, z: number }
---@param heading number
---@param cb? fun(netId: integer|false)
---@return integer|nil netId
function ESX.OneSync.SpawnObject(model, coords, heading, cb)
    return answer(cb, function()
        local entity = CreateObject(type(model) == 'string' and joaat(model) or model, coords.x, coords.y, coords.z, true, true, false)
        if not aiLib.waitFor(function() return DoesEntityExist(entity) or nil end, 8000) then return nil end
        SetEntityHeading(entity, heading or 0.0)
        return netIdOf(entity)
    end)
end

---@param model string|integer
---@param coords vector3|{ x: number, y: number, z: number }
---@param heading number
---@param cb? fun(netId: integer|false)
---@return integer|nil netId
function ESX.OneSync.SpawnPed(model, coords, heading, cb)
    return answer(cb, function()
        local entity = CreatePed(0, type(model) == 'string' and joaat(model) or model, coords.x, coords.y, coords.z, heading or 0.0, true, true)
        if not aiLib.waitFor(function() return DoesEntityExist(entity) or nil end, 8000) then return nil end
        return netIdOf(entity)
    end)
end

---@param model string|integer
---@param vehicle integer entity
---@param seat integer
---@param cb? fun(netId: integer|false)
---@return integer|nil netId
function ESX.OneSync.SpawnPedInVehicle(model, vehicle, seat, cb)
    return answer(cb, function()
        local entity = CreatePedInsideVehicle(vehicle, 1, type(model) == 'string' and joaat(model) or model, seat, true, true)
        if not aiLib.waitFor(function() return DoesEntityExist(entity) or nil end, 8000) then return nil end
        return netIdOf(entity)
    end)
end

---@param origin integer|vector3|table a player server id or coordinates
---@return vector3
local function originOf(origin)
    if type(origin) == 'number' then return GetEntityCoords(GetPlayerPed(origin)) end
    return vector3(origin.x, origin.y, origin.z)
end

---@class ESXNearbyPlayer
---@field id integer
---@field ped integer network id
---@field coords vector3
---@field dist number

--- Candidate players around `origin`: a player's OneSync scope through ai-core (ai-lib `playersNear`, the player
--- included) within its range, else the loaded players near the point (ai-lib `playersNearCoords`).
---@param origin integer|vector3|table
---@param distance number
---@param bucket? integer
---@return integer[]
local function candidates(origin, distance, bucket)
    if type(origin) == 'number' and distance <= 400 then
        return aiLib.playersNear(origin, distance)
    end
    return aiLib.playersNearCoords(originOf(origin), distance, bucket)
end

---@param origin integer|vector3|table
---@param distance? number
---@param ignore? table<integer, boolean>
---@param bucket? integer
---@param closest boolean
---@return ESXNearbyPlayer[]|ESXNearbyPlayer|table
local function nearbyPlayers(origin, distance, ignore, bucket, closest)
    distance = tonumber(distance) or 100
    ignore = type(ignore) == 'table' and ignore or {}
    local at = originOf(origin)
    local out, best = {}, nil
    for _, id in ipairs(candidates(origin, distance, bucket)) do
        local ped = GetPlayerPed(id)
        if ped ~= 0 and not ignore[id] and (not bucket or GetPlayerRoutingBucket(id) == bucket) and not (closest and id == origin) then
            local coords = GetEntityCoords(ped)
            local dist = #(at - coords)
            if dist <= distance then
                local entry = { id = id, ped = NetworkGetNetworkIdFromEntity(ped), coords = coords, dist = dist }
                if not closest then out[#out + 1] = entry
                elseif not best or dist < best.dist then best = entry end
            end
        end
    end
    if closest then return best or {} end
    return out
end

---@param source integer|vector3|table a player server id or coordinates
---@param maxDistance? number default 100
---@param ignore? table<integer, boolean>
---@param routingBucket? integer
---@return ESXNearbyPlayer[]
function ESX.OneSync.GetPlayersInArea(source, maxDistance, ignore, routingBucket)
    return nearbyPlayers(source, maxDistance, ignore, routingBucket, false) --[[@as ESXNearbyPlayer[] ]]
end

---@param source integer|vector3|table
---@param maxDistance? number default 100
---@param ignore? table<integer, boolean>
---@param routingBucket? integer
---@return ESXNearbyPlayer|table empty when none
function ESX.OneSync.GetClosestPlayer(source, maxDistance, ignore, routingBucket)
    return nearbyPlayers(source, maxDistance, ignore, routingBucket, true)
end

---@param entities integer[]
---@param coords integer|vector3|table
---@param modelFilter? table<integer, boolean>
---@param maxDistance? number
---@param isPed? boolean
---@return integer[] network ids
local function entitiesInArea(entities, coords, modelFilter, maxDistance, isPed)
    local at = originOf(coords)
    local out = {}
    for _, entity in ipairs(entities) do
        if (not isPed or not IsPedAPlayer(entity)) and (not modelFilter or modelFilter[GetEntityModel(entity)]) then
            if not maxDistance or #(at - GetEntityCoords(entity)) <= maxDistance then out[#out + 1] = NetworkGetNetworkIdFromEntity(entity) end
        end
    end
    return out
end

---@param entities integer[]
---@param coords integer|vector3|table
---@param modelFilter? table<integer, boolean>
---@param isPed? boolean
---@return integer netId, number distance, vector3 coords
local function closestEntity(entities, coords, modelFilter, isPed)
    local at = originOf(coords)
    local best, bestDist, bestCoords = 0, 100.0, vector3(0.0, 0.0, 0.0)
    for _, entity in ipairs(entities) do
        if (not isPed or not IsPedAPlayer(entity)) and (not modelFilter or modelFilter[GetEntityModel(entity)]) then
            local entityCoords = GetEntityCoords(entity)
            local dist = #(at - entityCoords)
            if dist < bestDist then best, bestDist, bestCoords = entity, dist, entityCoords end
        end
    end
    return best ~= 0 and NetworkGetNetworkIdFromEntity(best) or 0, bestDist, bestCoords
end

---@param coords integer|vector3|table
---@param maxDistance? number
---@param modelFilter? table<integer, boolean>
---@return integer[]
function ESX.OneSync.GetPedsInArea(coords, maxDistance, modelFilter) return entitiesInArea(GetAllPeds() --[[@as integer[] ]], coords, modelFilter, maxDistance, true) end

---@param coords integer|vector3|table
---@param maxDistance? number
---@param modelFilter? table<integer, boolean>
---@return integer[]
function ESX.OneSync.GetObjectsInArea(coords, maxDistance, modelFilter) return entitiesInArea(GetAllObjects() --[[@as integer[] ]], coords, modelFilter, maxDistance) end

---@param coords integer|vector3|table
---@param maxDistance? number
---@param modelFilter? table<integer, boolean>
---@return integer[]
function ESX.OneSync.GetVehiclesInArea(coords, maxDistance, modelFilter) return entitiesInArea(GetAllVehicles() --[[@as integer[] ]], coords, modelFilter, maxDistance) end

---@param coords integer|vector3|table
---@param modelFilter? table<integer, boolean>
---@return integer netId, number distance, vector3 coords
function ESX.OneSync.GetClosestPed(coords, modelFilter) return closestEntity(GetAllPeds() --[[@as integer[] ]], coords, modelFilter, true) end

---@param coords integer|vector3|table
---@param modelFilter? table<integer, boolean>
---@return integer netId, number distance, vector3 coords
function ESX.OneSync.GetClosestObject(coords, modelFilter) return closestEntity(GetAllObjects() --[[@as integer[] ]], coords, modelFilter) end

--- A player's closest vehicle comes from ai-lib's `nearestVehicleTo` (the one they sit in first).
---@param coords integer|vector3|table
---@param modelFilter? table<integer, boolean>
---@return integer netId, number distance, vector3 coords
function ESX.OneSync.GetClosestVehicle(coords, modelFilter)
    if type(coords) ~= 'number' then return closestEntity(GetAllVehicles() --[[@as integer[] ]], coords, modelFilter) end
    local vehicle = aiLib.nearestVehicleTo(coords, 100.0, modelFilter and function(v) return modelFilter[GetEntityModel(v)] == true end or nil)
    if vehicle == 0 then return 0, 100.0, vector3(0.0, 0.0, 0.0) end
    local at = GetEntityCoords(vehicle)
    return NetworkGetNetworkIdFromEntity(vehicle), #(originOf(coords) - at), at
end

-- es_extended's (deprecated) admin spawn callback.
ESX.RegisterServerCallback('esx:spawnVehicle', function(source, cb, vehData)
    if not Bridge.isAdmin(source) then return cb(false) end
    vehData = type(vehData) == 'table' and vehData or {}
    local ped = GetPlayerPed(source)
    if ped == 0 then return cb(false) end
    local model = vehData.model
    if (type(model) ~= 'string' or model == '') and not (finite(model) and model == math.floor(model)) then model = 'adder' end
    local coords = vehData.coords
    if type(coords) ~= 'table' and type(coords) ~= 'vector3' and type(coords) ~= 'vector4' or not finite(coords.x) or not finite(coords.y) or not finite(coords.z) then
        coords = GetEntityCoords(ped)
    end
    local heading = tonumber(vehData.heading) or GetEntityHeading(ped)
    ESX.OneSync.SpawnVehicle(model, coords, heading, type(vehData.props) == 'table' and vehData.props or {}, function(netId)
        if vehData.warp and netId then
            local vehicle = NetworkGetEntityFromNetworkId(netId)
            aiLib.waitFor(function()
                if not DoesEntityExist(vehicle) or GetVehiclePedIsIn(ped, false) == vehicle then return true end
                TaskWarpPedIntoVehicle(ped, vehicle, -1)
                return nil
            end, 1000, 50)
        end
        cb(netId)
    end)
end)

-- Extended vehicles: ESX's owned vehicle object on ai-vehicles (owner = the citizenid of a loaded character).

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
