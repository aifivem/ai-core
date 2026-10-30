---Waits (call from a thread) until the entity of a network id exists on this client and returns it; 0 after
---`timeout` ms (default 5000).
---@param netId integer
---@param timeout? integer
---@return integer
return function(netId, timeout)
    return aiLib.waitFor(function()
        if not NetworkDoesEntityExistWithNetworkId(netId) then return nil end
        local entity = NetToEnt(netId)
        return entity ~= 0 and entity or nil
    end, timeout or 5000) or 0
end
