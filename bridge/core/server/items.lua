-- ai-core's framework bridge, server side: items through ai-core's inventory layer (definitions in QB's item shape,
-- kept until the inventory or a definition changes; item use).

local core = Bridge.core

--- ai-core's inventory layer (JS side, `resource/server/inventory`): the active inventory answers every item call,
--- false / 0 / empty while none runs.
Bridge.inventory = function()
    return core
end

--- An item definition from the active inventory in the QB item shape, cached per name.
---@type table<string, table|false>
local itemCache = {}

---@class AiItemDefinition
---@field name string
---@field label string
---@field weight number
---@field unique boolean
---@field close boolean
---@field description string

local qbItem = BridgeShapes.qbItem

---@param name string
---@return table|nil
function Bridge.itemDefinition(name)
    local cached = itemCache[name]
    if cached ~= nil then return cached or nil end
    local definition = core:GetItemDefinition(name)
    cached = definition and qbItem(name, definition) or false
    itemCache[name] = cached
    return cached or nil
end

--- The whole list, read once from the inventory (tgiann / ox `Items()` through ai-core) and kept until it changes.
---@type table<string, table>|nil
local allItems = nil

--- Every item definition of the active inventory in the QB item shape: a fresh table each call (callers add to it),
--- the inventory is asked only after a change.
---@return table<string, table>
function Bridge.itemDefinitions()
    if not allItems then
        allItems = {}
        for name, definition in pairs(core:GetItemDefinitions() or {}) do
            allItems[name] = qbItem(name, definition)
            itemCache[name] = allItems[name]
        end
    end
    local out = {}
    for name, item in pairs(allItems) do out[name] = item end
    return out
end

local function dropItems()
    itemCache, allItems = {}, nil
end

-- Another inventory, the same one restarted (its item files may have changed) or an edited definition.
AddEventHandler('ai-core:inventoryChanged', dropItems)
AddEventHandler('ai-core:itemDefinitionsChanged', dropItems)
AddEventHandler('onResourceStart', function(resource)
    if resource == GlobalState['ai:inventory'] then dropItems() end
end)

--- Runs the handler registered for an item (ESX `UseItem`, QB / Qbox `CanUseItem`); `...` may hold the item table.
---@param source integer
---@param name string
---@return any
function Bridge.useItem(source, name, ...)
    for i = 1, select('#', ...) do
        local value = select(i, ...)
        if type(value) == 'table' then return core:UseItem(source, name, value) end
    end
    return core:UseItem(source, name)
end
