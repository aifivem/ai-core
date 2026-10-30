---Hands up and pointing of whatever emote script runs, through ai-core (tgiann-emotes, ai-smallresources).
return {
    ---@return boolean
    isHandsUp = function() return exports['ai-core']:IsHandsUp() end,
    ---@return boolean
    isPointing = function() return exports['ai-core']:IsPointing() end,
    ---@return string?
    provider = function() return exports['ai-core']:GetGestureProvider() end,
}
