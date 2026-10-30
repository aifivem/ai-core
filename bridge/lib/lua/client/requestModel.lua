---Loads a model and returns its hash, or nil when it does not exist or did not load within `timeout` ms (10000).
---Call SetModelAsNoLongerNeeded(hash) when done.
---@param model string|integer
---@param timeout? integer
---@return integer?
return function(model, timeout)
    local hash = type(model) == 'number' and model or GetHashKey(model)
    if not IsModelInCdimage(hash) then return nil end
    RequestModel(hash)
    return aiLib.waitFor(function() return HasModelLoaded(hash) and hash or nil end, timeout or 10000)
end
