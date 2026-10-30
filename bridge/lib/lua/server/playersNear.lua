---Players within `radius` metres of a player (candidates from OneSync scope through ai-core, then distance), the
---player themselves excluded. Use it instead of walking every player.
---@param src integer
---@param radius number
---@return integer[]
return function(src, radius)
    local origin = GetEntityCoords(GetPlayerPed(src))
    local out = {}
    for _, other in ipairs(exports['ai-core']:GetPlayersInScope(src) or {}) do
        local ped = GetPlayerPed(other)
        if other ~= src and ped ~= 0 and #(GetEntityCoords(ped) - origin) <= radius then out[#out + 1] = other end
    end
    return out
end
