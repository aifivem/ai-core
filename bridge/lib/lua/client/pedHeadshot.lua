---Registers a headshot of a ped and waits until the game rendered it; returns the handle and its texture name (the
---`txd` and texture of a `https://nui-img/<txd>/<txd>` picture), or nil after `timeout` ms (5000).
---Call `UnregisterPedheadshot(handle)` when it is no longer shown.
---@param ped integer
---@param transparent? boolean
---@param timeout? integer
---@return integer?, string?
return function(ped, transparent, timeout)
    if not DoesEntityExist(ped) then return nil end
    local handle = transparent and RegisterPedheadshotTransparent(ped) or RegisterPedheadshot(ped)
    local ready = aiLib.waitFor(function() return IsPedheadshotReady(handle) and IsPedheadshotValid(handle) or nil end, timeout or 5000)
    if not ready then
        UnregisterPedheadshot(handle)
        return nil
    end
    return handle, GetPedheadshotTxdString(handle)
end
