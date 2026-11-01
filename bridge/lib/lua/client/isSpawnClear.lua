---No vehicle stands within `radius` metres of `coords` (a spawn spot is free); stops at the first one found.
---@param coords vector3|{x: number, y: number, z: number}
---@param radius number
---@return boolean
return function(coords, radius)
    local at = vector3(coords.x, coords.y, coords.z)
    for _, vehicle in ipairs(GetGamePool('CVehicle')) do
        if #(GetEntityCoords(vehicle) - at) <= radius then return false end
    end
    return true
end
