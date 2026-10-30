---Loads a weapon's model and assets; returns the hash, or nil when it did not load within `timeout` ms (10000).
---Call `RemoveWeaponAsset(hash)` when done.
---@param weapon string|integer
---@param timeout? integer
---@return integer?
return function(weapon, timeout)
    local hash = type(weapon) == 'number' and weapon or GetHashKey(weapon)
    RequestWeaponAsset(hash, 31, 0)
    return aiLib.waitFor(function() return HasWeaponAssetLoaded(hash) and hash or nil end, timeout or 10000)
end
