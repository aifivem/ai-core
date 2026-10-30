---The live vehicle behind a client's network id, or 0 (not a positive integer, not networked, gone, not a vehicle).
---@param netId any
---@return integer
return function(netId)
    if math.type(netId) ~= 'integer' or netId < 1 or netId > 2147483647 then return 0 end
    local entity = NetworkGetEntityFromNetworkId(netId)
    if entity ~= 0 and DoesEntityExist(entity) and GetEntityType(entity) == 2 then return entity end
    return 0
end
