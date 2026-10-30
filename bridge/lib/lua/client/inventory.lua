---Items through ai-core's inventory layer (whatever inventory runs).
return {
    ---Opens the player's own inventory screen.
    openInventory = function() exports['ai-core']:OpenInventory() end,
    ---@param item string
    ---@param count? integer
    ---@return boolean
    hasItem = function(item, count) return exports['ai-core']:HasItem(item, count or 1) end,
    ---The weapon item in the player's hand, or nil (read it when the weapon changes, not per frame).
    ---@return { name: string, label: string, image?: string }?
    currentWeapon = function() return exports['ai-core']:GetCurrentWeapon() end,
}
