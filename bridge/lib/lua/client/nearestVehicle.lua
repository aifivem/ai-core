---The closest vehicle within `metres` of the local player (the one they sit in first, unless `notOwn`); `networked`
---(default true) skips local-only vehicles; `filter` skips vehicles it refuses (the closest one the player stands
---behind, not merely the closest). 0 when none.
---@param metres number
---@param options? { networked?: boolean, notOwn?: boolean, filter?: fun(vehicle: integer): boolean }
---@return integer
return function(metres, options)
    options = options or {}
    local cache = aiLib.cache
    local filter = options.filter
    if cache.vehicle and not options.notOwn and (not filter or filter(cache.vehicle)) then return cache.vehicle end
    local origin = GetEntityCoords(cache.ped)
    local best, bestDist = 0, metres
    for _, vehicle in ipairs(GetGamePool('CVehicle')) do
        if vehicle ~= cache.vehicle then
            if options.networked == false or NetworkGetEntityIsNetworked(vehicle) then
                local d = #(GetEntityCoords(vehicle) - origin)
                if d < bestDist and (not filter or filter(vehicle)) then best, bestDist = vehicle, d end
            end
        end
    end
    return best
end
