-- Usable items: QB's CreateUseableItem, CanUseItem, UseItem and HasItem through ai-core's inventory layer.

local core = Bridge.core
local isCallable, qbStack, hasItem, playerId = BridgeQB.isCallable, BridgeQB.qbStack, BridgeQB.hasItem, BridgeQB.playerId

---@param name string
---@param data function|{ cb?: function, callback?: function }
function QBCore.Functions.CreateUseableItem(name, data)
    local cb = data
    if type(data) == 'table' and not isCallable(data) then cb = data.cb or data.callback end
    if not isCallable(cb) then return end
    ---@cast cb function
    QBCore.UsableItems[name] = { func = cb, resource = GetInvokingResource() or 'ai-core' }
    local inv = Bridge.inventory()
    if inv then inv:RegisterUsableItem(name, function(source, item) cb(source, qbStack(item)) end) end
end

--- What the inventory (qb-inventory, tgiann-inventory) calls when a player uses an item: QB's `{ func }` entry or nil.
---@param name string
---@return { func: fun(source: integer, item?: table): any, resource: string }|nil
function QBCore.Functions.CanUseItem(name)
    if not core:IsUsableItem(name) then return nil end
    return { func = function(source, item) return Bridge.useItem(source, name, item) end, resource = 'ai-core' }
end

---@param source integer
---@param items string|string[]|table<string, integer>
---@param amount? integer
function QBCore.Functions.HasItem(source, items, amount)
    return hasItem(source, items, amount)
end

--- Runs the registered use handler of an item for a player (qb-core forwards to qb-inventory's `UseItem`).
---@param source integer
---@param item string|table the item name or a QB item table
function QBCore.Functions.UseItem(source, item)
    local id = playerId(source)
    local name = type(item) == 'table' and item.name or item
    if not id or type(name) ~= 'string' then return end
    return Bridge.useItem(id, name, type(item) == 'table' and item or nil)
end
