---The closest vehicle within `metres` of a player (the one they sit in first) that passes `filter`; 0 when none.
---Walks every vehicle: for commands and actions, not ticks.
---@param src integer
---@param metres number
---@param filter? fun(vehicle: integer): boolean
---@return integer
return function(src, metres, filter)
    local ped = GetPlayerPed(src)
    local own = GetVehiclePedIsIn(ped, false)
    if own ~= 0 and (not filter or filter(own)) then return own end
    local origin = GetEntityCoords(ped)
    local best, bestDist = 0, metres
    for _, vehicle in ipairs(GetAllVehicles()) do
        local d = #(GetEntityCoords(vehicle) - origin)
        if d < bestDist and (not filter or filter(vehicle)) then best, bestDist = vehicle, d end
    end
    return best
end
