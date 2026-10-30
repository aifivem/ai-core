---Fades the screen out and waits until it is black (call from a thread). `aiLib.fadeIn(ms)` brings it back.
---@param ms? integer default 300
return function(ms)
    ms = ms or 300
    DoScreenFadeOut(ms)
    aiLib.waitFor(function() return IsScreenFadedOut() or nil end, ms + 2000)
end
