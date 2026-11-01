---Loads a scaleform movie and returns its handle, or 0 when it did not load within `timeout` ms (10000).
---Call `SetScaleformMovieAsNoLongerNeeded(handle)` when done. Call from a thread.
---@param name string
---@param timeout? integer
---@return integer
return function(name, timeout)
    local handle = RequestScaleformMovie(name)
    if handle == 0 then return 0 end
    if aiLib.waitFor(function() return HasScaleformMovieLoaded(handle) or nil end, timeout or 10000) then return handle end
    SetScaleformMovieAsNoLongerNeeded(handle)
    return 0
end
