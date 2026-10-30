---Loads a movement clipset (crouch walk, injured walk); returns it, or nil when it did not load within `timeout` ms.
---Call `RemoveAnimSet(set)` when it is no longer used.
---@param set string
---@param timeout? integer
---@return string?
return function(set, timeout)
    RequestAnimSet(set)
    return aiLib.waitFor(function() return HasAnimSetLoaded(set) and set or nil end, timeout or 10000)
end
