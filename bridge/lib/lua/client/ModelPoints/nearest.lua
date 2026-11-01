-- The closest object or vehicle of a model point (lua/client/ModelPoints.lua): GTA's closest-object query per model,
-- the object index for points with many models, the vehicle pool for vehicle models. Returns `nearest`,
-- `advanceIndex` (the index walk the scan drives) and `DIRECT_MODELS`.

-- Up to this many models a point asks GTA for the closest object of each; more models use the object index (one
-- closest-object query per model and scan costs milliseconds with hundreds of models).
local DIRECT_MODELS = 6
local INDEX_CHUNK = 300
local index = { candidates = {}, pool = {}, next = 1, found = {} }

---Walks a chunk of the object pool and keeps the objects of the wanted models; a full walk replaces the candidates.
---@param wanted table<integer, boolean>
local function advanceIndex(wanted)
    if index.next > #index.pool then
        index.candidates = index.found
        index.found = {}
        index.pool = GetGamePool('CObject')
        index.next = 1
    end
    local last = math.min(#index.pool, index.next + INDEX_CHUNK - 1)
    for i = index.next, last do
        local entity = index.pool[i]
        if entity and wanted[GetEntityModel(entity)] then index.found[#index.found + 1] = entity end
    end
    index.next = last + 1
end

---@param point table
---@param x number
---@param y number
---@param z number
---@return integer
local function nearest(point, x, y, z)
    local radius = point.options.radius or 1.5
    if point.options.vehicles then
        local best, bestDist = 0, radius
        for _, vehicle in ipairs(GetGamePool('CVehicle')) do
            if (point.global and NetworkGetEntityIsNetworked(vehicle)) or point.hashSet[GetEntityModel(vehicle)] then
                local d = #(GetEntityCoords(vehicle) - vector3(x, y, z))
                if d < bestDist then best, bestDist = vehicle, d end
            end
        end
        return best
    end
    if #point.hashes > DIRECT_MODELS then
        local best, bestDist = 0, radius
        for _, entity in ipairs(index.candidates) do
            if DoesEntityExist(entity) and point.hashSet[GetEntityModel(entity)] then
                local d = #(GetEntityCoords(entity) - vector3(x, y, z))
                if d < bestDist then best, bestDist = entity, d end
            end
        end
        return best
    end
    for _, hash in ipairs(point.hashes) do
        local found = GetClosestObjectOfType(x, y, z, radius, hash, false, false, false)
        if found ~= 0 then return found end
    end
    return 0
end

return nearest, advanceIndex, DIRECT_MODELS
