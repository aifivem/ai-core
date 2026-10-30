---Loads a particle asset; returns it, or nil when it did not load within `timeout` ms.
---@param asset string
---@param timeout? integer
---@return string?
return function(asset, timeout)
    RequestNamedPtfxAsset(asset)
    return aiLib.waitFor(function() return HasNamedPtfxAssetLoaded(asset) and asset or nil end, timeout or 10000)
end
