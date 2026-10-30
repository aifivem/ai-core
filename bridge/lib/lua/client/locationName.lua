---The street, crossing and zone names at a point (default the local ped), like the TypeScript lib's `locationName`.
---`zone` is the area's label (`Vinewood Hills`, '' where the game has none); `crossing` is nil when there is none.
---@param coords? vector3
---@return { street: string, crossing: string?, zone: string }
return function(coords)
    coords = coords or GetEntityCoords(PlayerPedId())
    local streetHash, crossingHash = GetStreetNameAtCoord(coords.x, coords.y, coords.z)
    local crossing = crossingHash ~= 0 and GetStreetNameFromHashKey(crossingHash) or ''
    local zone = GetLabelText(GetNameOfZone(coords.x, coords.y, coords.z))
    return {
        street = streetHash ~= 0 and GetStreetNameFromHashKey(streetHash) or '',
        crossing = crossing ~= '' and crossing or nil,
        zone = zone ~= 'NULL' and zone or '',
    }
end
