---Players with a loaded character whose ped is within `radius` of a point (in routing bucket `bucket` when given).
---Walks every loaded player: for actions and commands, not ticks; around a player use `playersNear`.
---@param coords vector3|{x: number, y: number, z: number}
---@param radius number
---@param bucket? integer
---@return integer[]
return function(coords, radius, bucket)
    local at = vector3(coords.x, coords.y, coords.z)
    local out = {}
    for _, src in ipairs(aiLib.online.sources()) do
        local ped = GetPlayerPed(src)
        if ped ~= 0 and #(GetEntityCoords(ped) - at) <= radius
            and (not bucket or GetPlayerRoutingBucket(src) == bucket) then
            out[#out + 1] = src
        end
    end
    return out
end
