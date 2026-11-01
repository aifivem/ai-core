-- ESX on ai-core, server side: ESX.OneSync's area lookups (players, peds, objects and vehicles in an area, the closest
-- of each).

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
