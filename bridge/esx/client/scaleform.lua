-- ESX on ai-core, client side: ESX.Scaleform (esx_lib scaleform, GPL-3.0) on ai-lib's loader and scheduler.

ESX.Scaleform = { Utils = {} }

--- Loads a scaleform movie (ai-lib's loader); the handle once loaded, 0 when it did not load within 10 s (ESX waits
--- forever).
---@param movie string
---@return integer
function ESX.Scaleform.Utils.RequestScaleformMovie(movie)
    return aiLib.requestScaleformMovie(movie)
end

--- Calls a method of a scaleform movie (loaded by name when a name is given). The caller frees the movie with
--- `SetScaleformMovieAsNoLongerNeeded`.
---@param scaleform integer|string
---@param methodName string
---@param returnValue? boolean
---@param ... number|string|boolean
---@return integer, integer?
function ESX.Scaleform.Utils.RunMethod(scaleform, methodName, returnValue, ...)
    if type(scaleform) ~= 'number' then scaleform = ESX.Scaleform.Utils.RequestScaleformMovie(scaleform) end
    BeginScaleformMovieMethod(scaleform, methodName)
    for _, arg in ipairs({ ... }) do
        local kind = type(arg)
        if kind == 'number' then
            if math.type(arg) == 'float' then ScaleformMovieMethodAddParamFloat(arg) else ScaleformMovieMethodAddParamInt(arg) end
        elseif kind == 'string' then
            ScaleformMovieMethodAddParamTextureNameString(arg)
        elseif kind == 'boolean' then
            ScaleformMovieMethodAddParamBool(arg)
        end
    end
    if returnValue then return scaleform, EndScaleformMovieMethodReturnValue() end
    EndScaleformMovieMethod()
    return scaleform
end

--- Draws a movie full screen for `sec` seconds from ai-lib's scheduler, then frees it; waits like ESX.
---@param scaleform integer
---@param sec number
local function showFor(scaleform, sec)
    local job = aiLib.every(0, function() DrawScaleformMovieFullscreen(scaleform, 255, 255, 255, 255, 0) end, { name = 'esxScaleform' })
    Wait(math.floor((tonumber(sec) or 0) * 1000))
    job:stop()
    SetScaleformMovieAsNoLongerNeeded(scaleform)
end

---@param title string
---@param msg string
---@param sec number
function ESX.Scaleform.ShowFreemodeMessage(title, msg, sec)
    showFor(ESX.Scaleform.Utils.RunMethod('MP_BIG_MESSAGE_FREEMODE', 'SHOW_SHARD_WASTED_MP_MESSAGE', false, title, msg), sec)
end

---@param title string
---@param msg string
---@param bottom string
---@param sec number
function ESX.Scaleform.ShowBreakingNews(title, msg, bottom, sec)
    local scaleform = ESX.Scaleform.Utils.RunMethod('BREAKING_NEWS', 'SET_TEXT', false, msg, bottom)
    ESX.Scaleform.Utils.RunMethod(scaleform, 'SET_SCROLL_TEXT', false, 0, 0, title)
    ESX.Scaleform.Utils.RunMethod(scaleform, 'DISPLAY_SCROLL_TEXT', false, 0, 0)
    showFor(scaleform, sec)
end

---@param title string
---@param msg string
---@param bottom string
---@param sec number
function ESX.Scaleform.ShowPopupWarning(title, msg, bottom, sec)
    showFor(ESX.Scaleform.Utils.RunMethod('POPUP_WARNING', 'SHOW_POPUP_WARNING', false, 500.0, title, msg, bottom, true), sec)
end

---@param sec number
function ESX.Scaleform.ShowTrafficMovie(sec)
    showFor(ESX.Scaleform.Utils.RunMethod('TRAFFIC_CAM', 'PLAY_CAM_MOVIE', false), sec)
end
