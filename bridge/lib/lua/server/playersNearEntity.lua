---Players within `radius` metres of an entity (candidates from its owner's OneSync scope through ai-core).
---@param entity integer
---@param radius number
---@return integer[]
return function(entity, radius)
    local owner = NetworkGetEntityOwner(entity)
    if owner <= 0 then return {} end
    local origin = GetEntityCoords(entity)
    local out = {}
    local candidates = exports['ai-core']:GetPlayersInScope(owner) or {}
    candidates[#candidates + 1] = owner
    for _, other in ipairs(candidates) do
        local ped = GetPlayerPed(other)
        if ped ~= 0 and #(GetEntityCoords(ped) - origin) <= radius then out[#out + 1] = other end
    end
    return out
end
