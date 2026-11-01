---The closest vehicle within `metres` of the local player (the one they sit in first, unless `notOwn`) or of
---`options.from` (a point: only distance counts, the player's own vehicle included unless `notOwn`); `networked`
---(default true) skips local-only vehicles; `filter` skips vehicles it refuses (the closest one the player stands
---behind, not merely the closest). Returns the vehicle and its distance; 0 when none.
---@param metres number
---@param options? { networked?: boolean, notOwn?: boolean, filter?: (fun(vehicle: integer): boolean), from?: vector3|{x: number, y: number, z: number} }
---@return integer vehicle, number? distance
return function(metres, options)
    options = options or {}
    local cache = aiLib.cache
    local filter = options.filter
    local from = options.from and vector3(options.from.x, options.from.y, options.from.z)
    local origin = from or GetEntityCoords(cache.ped)
    if cache.vehicle and not options.notOwn and not from and (not filter or filter(cache.vehicle)) then
        return cache.vehicle, #(GetEntityCoords(cache.vehicle) - origin)
    end
    -- The own vehicle is preferred only when measuring from the player; skipped in the walk when it was offered.
    local skipOwn = options.notOwn or not from
    local best, bestDist = 0, metres
    for _, vehicle in ipairs(GetGamePool('CVehicle')) do
        if not (skipOwn and vehicle == cache.vehicle) then
            if options.networked == false or NetworkGetEntityIsNetworked(vehicle) then
                local d = #(GetEntityCoords(vehicle) - origin)
                if d < bestDist and (not filter or filter(vehicle)) then best, bestDist = vehicle, d end
            end
        end
    end
    if best == 0 then return 0 end
    return best, bestDist
end
