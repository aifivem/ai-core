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
    ---How many of an item the player holds; nil when the active inventory has no client count.
    ---@param item string
    ---@return integer?
    itemCount = function(item) return exports['ai-core']:GetItemCount(item) end,
    ---An item's `{ name, label, weight, unique, close, description, image? }` from ai-core's client mirror, or nil.
    ---@param name string
    itemDefinition = function(name) return exports['ai-core']:GetItemDefinition(name) end,
    ---Every item definition of ai-core's client mirror, by name.
    ---@return table<string, table>
    itemDefinitions = function() return exports['ai-core']:GetItemDefinitions() or {} end,
    ---Every stack the player holds `{ name, label, count, slot, metadata }`; nil when the active inventory has no
    ---client list (ask your server).
    ---@return table[]?
    items = function() return exports['ai-core']:GetItems() end,
    ---The player's stacks by slot; nil when the active inventory has no client list.
    ---@return table<integer, table>?
    itemsBySlot = function()
        local list = exports['ai-core']:GetItems()
        if not list then return nil end
        local out = {}
        for _, stack in ipairs(list) do out[stack.slot] = stack end
        return out
    end,
    ---The first stack of an item the player holds; nil when none (or no client list).
    ---@return table?
    firstStack = function(item)
        for _, stack in ipairs(exports['ai-core']:GetItems() or {}) do
            if stack.name == item then return stack end
        end
    end,
    ---Runs `handler(item, count, previous)` each time the player's total of an item changes in the active inventory.
    ---@param handler fun(item: string, count: integer, previous: integer)
    onCount = function(handler)
        AddEventHandler('ai-core:client:itemCount', function(item, count, previous)
            if type(item) == 'string' and type(count) == 'number' then handler(item, count, tonumber(previous) or 0) end
        end)
    end,
}
