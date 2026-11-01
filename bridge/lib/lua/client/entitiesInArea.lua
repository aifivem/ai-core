local POOLS = { ped = 'CPed', object = 'CObject', vehicle = 'CVehicle' }

---Every ped / object / vehicle within `radius` metres of `coords` (the local ped included); one pool walk.
---@param kind 'ped'|'object'|'vehicle'
---@param coords vector3|{x: number, y: number, z: number}
---@param radius number
---@return integer[]
return function(kind, coords, radius)
    local at = vector3(coords.x, coords.y, coords.z)
    local out = {}
    for _, entity in ipairs(GetGamePool(POOLS[kind])) do
        if #(GetEntityCoords(entity) - at) <= radius then out[#out + 1] = entity end
    end
    return out
end
