---Players' hunger and thirst through ai-core's stress layer (the HUD that keeps them, ai-core's metadata without one).
return {
    ---Hunger and thirst to full (admin revive, hospital); false when the player has no character.
    ---@param src integer
    ---@return boolean
    refill = function(src) return exports['ai-core']:RefillNeeds(src) end,
}
