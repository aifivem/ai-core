---Loads a streamed texture dictionary; returns it, or nil when it did not load within `timeout` ms (10000).
---Call `SetStreamedTextureDictAsNoLongerNeeded(dict)` when done.
---@param dict string
---@param timeout? integer
---@return string?
return function(dict, timeout)
    RequestStreamedTextureDict(dict, false)
    return aiLib.waitFor(function() return HasStreamedTextureDictLoaded(dict) and dict or nil end, timeout or 10000)
end
