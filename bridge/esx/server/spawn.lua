-- ESX on ai-core, server side: ESX.GetVehicleType and the server spawns of ESX.OneSync (vehicles, objects, peds).

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
