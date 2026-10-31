---The waypoint the player set on the map, or nil.
---@return { x: number, y: number }?
return function()
    local blip = GetFirstBlipInfoId(8)
    if not DoesBlipExist(blip) then return nil end
    local coords = GetBlipInfoIdCoord(blip)
    return { x = coords.x, y = coords.y }
end
