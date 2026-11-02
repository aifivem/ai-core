---Players' hunger and thirst, kept by ai-core (character metadata, 0-100); any HUD only draws them.
return {
    ---Hunger and thirst to full (admin revive, hospital); false when the player has no character.
    ---@param src integer
    ---@return boolean
    refill = function(src) return exports['ai-core']:RefillNeeds(src) end,
    ---Adds hunger or thirst (0-100 scale; a negative amount takes it away), a food or drink's value.
    ---@param src integer
    ---@param need 'hunger'|'thirst'
    ---@param amount number
    ---@return boolean
    add = function(src, need, amount) return exports['ai-core']:AddNeed(src, need, amount) end,
    ---Sets hunger or thirst to a value (0-100, clamped); false when the player has no character.
    ---@param src integer
    ---@param need 'hunger'|'thirst'
    ---@param value number
    ---@return boolean
    set = function(src, need, value) return exports['ai-core']:SetNeed(src, need, value) end,
}
