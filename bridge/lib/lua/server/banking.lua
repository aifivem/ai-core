-- The banking script through ai-core's banking layer, like the TypeScript lib's `banking` (job money stays ai-core's).
local core = exports['ai-core']
return {
    ---Opens the banking script's screen for a player; false when it cannot be opened from outside.
    ---@param src integer
    ---@return boolean
    open = function(src) return core:OpenBank(src) end,
    ---The banking script's own balance of a job's society account (display only), nil when it keeps none.
    ---@param job string
    ---@return number?
    societyBalance = function(job) return core:GetBankSocietyBalance(job) end,
    ---@return string?
    provider = function() return core:GetBankingSystem() end,
}
