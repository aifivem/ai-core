local POOLS = { ped = 'CPed', object = 'CObject', vehicle = 'CVehicle' }

---The closest ped / object / vehicle to `from` (default the local ped) within `maxDistance` (default no limit) that
---passes `filter`, and its distance; 0 when none. Peds skip the local ped unless `ignoreLocal = false`. Every entity
---of the pool, local ones included; one `GetGamePool` walk per call (for actions, not ticks).
---@param kind 'ped'|'object'|'vehicle'
---@param from? vector3|{x: number, y: number, z: number}
---@param maxDistance? number
---@param options? { filter?: (fun(entity: integer): boolean), ignoreLocal?: boolean }
---@return integer entity, number? distance
return function(kind, from, maxDistance, options)
    options = options or {}
    local origin = from and vector3(from.x, from.y, from.z) or GetEntityCoords(aiLib.cache.ped)
    local skip = kind == 'ped' and options.ignoreLocal ~= false and aiLib.cache.ped or 0
    local filter = options.filter
    local best, bestDist = 0, maxDistance or math.huge
    for _, entity in ipairs(GetGamePool(POOLS[kind])) do
        if entity ~= skip then
            local d = #(GetEntityCoords(entity) - origin)
            if d < bestDist and (not filter or filter(entity)) then best, bestDist = entity, d end
        end
    end
    if best == 0 then return 0 end
    return best, bestDist
end
