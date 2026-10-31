---Players' stress through ai-core's stress layer, whatever HUD keeps it (ai-hud, qb-hud, TGIANN HUDs).
local core = exports['ai-core']
return {
    ---@param src integer
    ---@param amount number stress points to add (0-100 scale)
    ---@return boolean
    gain = function(src, amount) return amount > 0 and core:AddStress(src, amount) end,
    ---@param src integer
    ---@param amount number stress points to take away
    ---@return boolean
    relieve = function(src, amount) return amount > 0 and core:AddStress(src, -amount) end,
    ---@return string?
    provider = function() return core:GetStressSystem() end,
}
