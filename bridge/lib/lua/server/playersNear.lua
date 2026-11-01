---Players within `radius` metres of a player, the player themselves included (as the TypeScript lib): candidates from
---OneSync scope through ai-core, then distance. Use it instead of walking every player.
---@param src integer
---@param radius number
---@return integer[]
return function(src, radius)
    local ped = GetPlayerPed(src)
    if ped == 0 then return {} end
    local origin = GetEntityCoords(ped)
    local out = { src }
    for _, other in ipairs(exports['ai-core']:GetPlayersInScope(src) or {}) do
        local otherPed = GetPlayerPed(other)
        if other ~= src and otherPed ~= 0 and #(GetEntityCoords(otherPed) - origin) <= radius then out[#out + 1] = other end
    end
    return out
end
