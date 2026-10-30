---Items through ai-core's inventory layer: the active inventory (ai-inventory, or another the panel picks) answers.
---`inv` is a player server id or another inventory's id (stash name, plate).
local core = exports['ai-core']
return {
    addItem = function(inv, item, count, metadata, slot) return core:AddItem(inv, item, count, metadata, slot) end,
    removeItem = function(inv, item, count, metadata, slot) return core:RemoveItem(inv, item, count, metadata, slot) end,
    getItemCount = function(inv, item, metadata) return core:GetItemCount(inv, item, metadata) end,
    hasItem = function(inv, item, count) return core:HasItem(inv, item, count or 1) end,
    canCarryItem = function(inv, item, count, metadata) return core:CanCarryItem(inv, item, count, metadata) end,
    getItems = function(inv) return core:GetItems(inv) end,
    clearInventory = function(inv) return core:ClearInventory(inv) end,
    ---@param jobs? string[] only members of these jobs open it
    registerStash = function(name, label, slots, maxWeight, jobs) core:RegisterStash(name, label, slots, maxWeight, jobs) end,
    openInventory = function(src, inv) return core:OpenInventory(src, inv) end,
    ---Kept by ai-core: works for inventories that start later and survives an inventory restart. The handler gets
    ---`(source, { name, slot, count, metadata })`; returning false keeps the item.
    registerUsableItem = function(name, handler) return core:RegisterUsableItem(name, handler) end,
    getItemDefinition = function(name) return core:GetItemDefinition(name) end,
}
