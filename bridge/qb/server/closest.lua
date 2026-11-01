-- QBCore.Functions coordinates and closest player / vehicle / object / ped.

---@param entity integer
---@return vector4
function QBCore.Functions.GetCoords(entity)
    local coords = GetEntityCoords(entity)
    return vector4(coords.x, coords.y, coords.z, GetEntityHeading(entity))
end

---@param coords any
---@return vector3|nil
local function vec3(coords)
    local kind = type(coords)
    if coords == nil or kind == 'number' or kind == 'string' or kind == 'boolean' or kind == 'function' then return nil end
    local x, y, z = tonumber(coords.x), tonumber(coords.y), tonumber(coords.z)
    if not x or not y or not z then return nil end
    return vector3(x, y, z)
end

--- The closest entity of a list to a point (`skip` left out); -1, -1 when none.
---@param list integer[]
---@param origin vector3
---@param skip? integer
---@return integer, number
local function closestOf(list, origin, skip)
    local best, bestDist = -1, -1
    for i = 1, #list do
        local entity = list[i]
        if entity ~= skip then
            local d = #(GetEntityCoords(entity) - origin)
            if bestDist == -1 or d < bestDist then best, bestDist = entity, d end
        end
    end
    return best, bestDist
end

--- The closest other player to a player (ai-lib `nearestPlayerTo`: players in its OneSync scope) or to `coords`
--- (ai-lib `playersNearCoords`: loaded players).
---@param source integer
---@param coords? vector3|table
---@return integer closestPlayer, number closestDistance
function QBCore.Functions.GetClosestPlayer(source, coords)
    local origin = vec3(coords)
    if not origin then
        local other = aiLib.nearestPlayerTo(source, 500.0)
        if not other then return -1, -1 end
        return other, #(GetEntityCoords(GetPlayerPed(other)) - GetEntityCoords(GetPlayerPed(source)))
    end
    local best, bestDist = -1, -1
    for _, id in ipairs(aiLib.playersNearCoords(origin, math.huge)) do
        if id ~= source then
            local d = #(GetEntityCoords(GetPlayerPed(id)) - origin)
            if bestDist == -1 or d < bestDist then best, bestDist = id, d end
        end
    end
    return best, bestDist
end

--- The closest vehicle to a player (ai-lib `nearestVehicleTo`) or to `coords`.
---@param source integer
---@param coords? vector3|table
---@return integer closestVehicle, number closestDistance
function QBCore.Functions.GetClosestVehicle(source, coords)
    local origin = vec3(coords)
    if not origin then
        local vehicle = aiLib.nearestVehicleTo(source, math.huge)
        if vehicle == 0 then return -1, -1 end
        return vehicle, #(GetEntityCoords(vehicle) - GetEntityCoords(GetPlayerPed(source)))
    end
    return closestOf(GetAllVehicles() --[[@as integer[] ]], origin)
end

---@param source integer
---@param coords? vector3|table
---@return integer closestObject, number closestDistance
function QBCore.Functions.GetClosestObject(source, coords)
    return closestOf(GetAllObjects() --[[@as integer[] ]], vec3(coords) or GetEntityCoords(GetPlayerPed(source)))
end

---@param source integer
---@param coords? vector3|table
---@return integer closestPed, number closestDistance
function QBCore.Functions.GetClosestPed(source, coords)
    local own = GetPlayerPed(source)
    return closestOf(GetAllPeds() --[[@as integer[] ]], vec3(coords) or GetEntityCoords(own), own)
end

BridgeQB.vec3 = vec3
