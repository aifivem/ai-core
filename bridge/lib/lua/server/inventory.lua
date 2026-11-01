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
    ---An inventory's stacks by slot.
    ---@return table<integer, table>
    itemsBySlot = function(inv)
        local out = {}
        for _, stack in ipairs(core:GetItems(inv) or {}) do out[stack.slot] = stack end
        return out
    end,
    ---The first stack of an item in an inventory, or nil.
    ---@return table?
    firstStack = function(inv, item)
        for _, stack in ipairs(core:GetItems(inv) or {}) do
            if stack.name == item then return stack end
        end
    end,
    clearInventory = function(inv) return core:ClearInventory(inv) end,
    ---@param jobs? string[] only members of these jobs open it
    registerStash = function(name, label, slots, maxWeight, jobs) core:RegisterStash(name, label, slots, maxWeight, jobs) end,
    openInventory = function(src, inv) return core:OpenInventory(src, inv) end,
    ---Kept by ai-core: works for inventories that start later and survives an inventory restart. The handler gets
    ---`(source, { name, slot, count, metadata })`; returning false keeps the item.
    registerUsableItem = function(name, handler) return core:RegisterUsableItem(name, handler) end,
    getItemDefinition = function(name) return core:GetItemDefinition(name) end,
    ---Every item definition of the active inventory, by name.
    ---@return table<string, table>
    getItemDefinitions = function() return core:GetItemDefinitions() or {} end,
    ---Replaces the metadata of the stack at `slot`; false when the inventory could not.
    setItemMetadata = function(inv, slot, metadata) return core:SetItemMetadata(inv, slot, metadata) end,
    ---A player's weight limit in grams until the inventory reloads it; false when the inventory has no way.
    setMaxWeight = function(src, grams) return core:SetMaxWeight(src, grams) end,
    ---@return string[] names of every item a usable handler is registered for
    usableItems = function() return core:GetUsableItems() end,
    ---Kept by ai-core like stashes; `items` are `{ name, price }`.
    registerShop = function(name, label, items) core:RegisterShop(name, label, items) end,
    ---Opens a registered shop on the player's screen without range or access checks (check before).
    openShop = function(src, name) return core:OpenShop(src, name) end,
}
