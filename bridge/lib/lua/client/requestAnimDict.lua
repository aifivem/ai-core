---Loads an animation dictionary; returns it, or nil when it does not exist or did not load within `timeout` ms.
---@param dict string
---@param timeout? integer
---@return string?
return function(dict, timeout)
    if not DoesAnimDictExist(dict) then return nil end
    RequestAnimDict(dict)
    return aiLib.waitFor(function() return HasAnimDictLoaded(dict) and dict or nil end, timeout or 10000)
end
