---Revive, heal and the down state through ai-core's medical layer, whatever death / ambulance script runs.
local core = exports['ai-core']
return {
    ---Gets a downed player up where they lie; false when not down or no death script runs.
    ---@return boolean
    revive = function(src) return core:RevivePlayer(src) end,
    ---Full health for a player who is not down; false when no death script runs.
    ---@return boolean
    heal = function(src) return core:HealPlayer(src) end,
    ---Whether the player is down (false without a death script).
    ---@return boolean
    isDead = function(src) return core:IsPlayerDead(src) end,
    ---@return string?
    provider = function() return core:GetMedicalSystem() end,
}
