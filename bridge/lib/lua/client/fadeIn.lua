---Fades the screen back in and waits until it is clear (call from a thread); the pair of `fadeOut`.
---@param ms? integer default 400
return function(ms)
    ms = ms or 400
    DoScreenFadeIn(ms)
    aiLib.waitFor(function() return IsScreenFadedIn() or nil end, ms + 2000)
end
