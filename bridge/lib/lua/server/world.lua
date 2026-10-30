---Time and weather of whatever weather script runs, through ai-core (the qb-weathersync contract).
local core = exports['ai-core']
return {
    getWeather = function() return core:GetWeather() end,
    setWeather = function(weather) return core:SetWeather(weather) end,
    getTime = function() return core:GetTime() end,
    setTime = function(hour, minute) return core:SetTime(hour, minute) end,
    setBlackout = function(on) return core:SetBlackout(on) end,
    freezeTime = function(on) return core:FreezeTime(on) end,
}
