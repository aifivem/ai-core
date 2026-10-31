---Hands up, pointing and emotes of whatever emote script runs, through ai-core (tgiann-emotes, rpemotes).
return {
    ---@return boolean
    isHandsUp = function() return exports['ai-core']:IsHandsUp() end,
    ---@return boolean
    isPointing = function() return exports['ai-core']:IsPointing() end,
    ---@return string?
    provider = function() return exports['ai-core']:GetGestureProvider() end,
    ---Plays an emote by its command name (`e <name>`) in the running emote script.
    ---@param name string
    ---@return boolean
    playEmote = function(name) return exports['ai-core']:PlayEmote(name) end,
    ---Stops the emote the player plays.
    ---@return boolean
    cancelEmote = function() return exports['ai-core']:CancelEmote() end,
    ---@return string?
    emoteProvider = function() return exports['ai-core']:GetEmoteProvider() end,
}
