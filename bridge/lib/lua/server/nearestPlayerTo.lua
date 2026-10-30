---The closest other player within `metres` of `src` (up to ~424 m, OneSync scope candidates from ai-core) that passes
---`filter`; nil when none.
---@param src integer
---@param metres number
---@param filter? fun(other: integer): boolean
---@return integer?
return function(src, metres, filter)
    local origin = GetEntityCoords(GetPlayerPed(src))
    local best, bestDist = nil, metres
    for _, other in ipairs(exports['ai-core']:GetPlayersInScope(src) or {}) do
        if other ~= src then
            local d = #(GetEntityCoords(GetPlayerPed(other)) - origin)
            if d <= bestDist and (not filter or filter(other)) then best, bestDist = other, d end
        end
    end
    return best
end
