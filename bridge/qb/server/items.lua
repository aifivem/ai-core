-- A Player's items in QB's shape, read from ai-core's inventory layer, and QB's HasItem.

local core = Bridge.core

---@type table<integer, integer> source -> GetGameTimer() of the last `PlayerData.items` read
local itemsReadAt = {}

--- `PlayerData.items` is read from the inventory layer at most once a second per player (ai-core has no per-player
--- item change event); the bridge's own item calls read it again at once.
local ITEMS_TTL = 1000

--- One inventory stack in QB's item shape (the item definition from the cached QB item table).
---@param stack { name: string, label?: string, count: integer, slot: integer, metadata?: table }
---@return QBItem
local function qbStack(stack)
    local def = Bridge.itemDefinition(stack.name) or {}
    return {
        name = stack.name, label = stack.label or def.label or stack.name, amount = stack.count, count = stack.count,
        info = stack.metadata or {}, slot = stack.slot, weight = def.weight or 0, type = def.type or 'item',
        unique = def.unique or false, useable = def.useable or false, image = def.image or ('%s.png'):format(stack.name),
        shouldClose = def.shouldClose or false, description = def.description or '',
    }
end

---@param source integer
---@return table<integer, QBItem>
local function itemsOf(source)
    local out = {}
    for _, stack in ipairs(core:GetItems(source) or {}) do out[stack.slot] = qbStack(stack) end
    itemsReadAt[source] = GetGameTimer()
    return out
end

--- QB / qb-inventory HasItem: a name, a list of names (each `amount`) or `{ [name] = amount }`.
---@param source integer
---@param items string|string[]|table<string, integer>
---@param amount? integer
---@return boolean
local function hasItem(source, items, amount)
    if type(items) == 'string' then return core:HasItem(source, items, amount or 1) == true end
    if type(items) ~= 'table' then return false end
    if items[1] ~= nil then
        for _, name in ipairs(items) do
            if core:HasItem(source, name, amount or 1) ~= true then return false end
        end
        return true
    end
    for name, count in pairs(items) do
        if core:HasItem(source, name, tonumber(count) or 1) ~= true then return false end
    end
    return true
end

BridgeQB.itemsReadAt = itemsReadAt
BridgeQB.itemsTtl = ITEMS_TTL
BridgeQB.qbStack = qbStack
BridgeQB.itemsOf = itemsOf
BridgeQB.hasItem = hasItem
