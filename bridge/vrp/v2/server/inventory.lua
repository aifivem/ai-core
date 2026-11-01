local V = BridgeVRP2
local vRP = V.vRP
local core = Bridge.core
local v1, amountOf, coreExtension = V.v1, V.amountOf, V.coreExtension

-- Inventory: the active inventory through the vRP 1 item functions; items vRP 2 extensions define.
---@type table<string, { name: any, description: any, menu_builder: any, weight: any, owner: VrpOwner|nil }>
local items = {}
local ITEM_MENU = 'vRP:item'

local InventoryUser = {}

--- fullid -> amount.
---@return table<string, integer>
function InventoryUser:getInventory()
    local out = {}
    for id, entry in pairs(v1('getInventory', nil, self.cid) or {}) do
        out[id] = type(entry) == 'table' and entry.amount or entry
    end
    return out
end

---@param fullid any
---@return integer
function InventoryUser:getItemAmount(fullid) return v1('getInventoryItemAmount', 0, self.cid, fullid) or 0 end
---@return number
function InventoryUser:getInventoryWeight() return v1('getInventoryWeight', 0, self.cid) or 0 end
---@return number
function InventoryUser:getInventoryMaxWeight() return v1('getInventoryMaxWeight', 0, self.cid) or 0 end
function InventoryUser:clearInventory() v1('clearInventory', nil, self.cid) end

--- Gives `amount` of an item when it fits the weight limit; `dry` only checks.
---@param fullid any
---@param amount any
---@param dry? boolean
---@return boolean
function InventoryUser:tryGiveItem(fullid, amount, dry)
    amount = amountOf(amount)
    if not amount or amount <= 0 or type(fullid) ~= 'string' then return false end
    local item = vRP.EXT.Inventory:computeItem(fullid)
    if not item then return false end
    if self:getInventoryWeight() + item.weight * amount > self:getInventoryMaxWeight() then return false end
    if dry then return true end
    return v1('giveInventoryItem', false, self.cid, fullid, amount) == true
end

--- Takes `amount` of an item when the character holds it; `dry` only checks.
---@param fullid any
---@param amount any
---@param dry? boolean
---@return boolean
function InventoryUser:tryTakeItem(fullid, amount, dry)
    amount = amountOf(amount)
    if not amount or amount <= 0 or type(fullid) ~= 'string' then return false end
    if dry then return self:getItemAmount(fullid) >= amount end
    return v1('tryGetInventoryItem', false, self.cid, fullid, amount) == true
end

--- A stash of the active inventory (the move callbacks are not fired; `cb_close` is passed on).
---@param id any
---@param max_weight any
---@param cb_close any
function InventoryUser:openChest(id, max_weight, cb_close)
    v1('openChest', nil, self.source, id, max_weight, cb_close)
end

local Inventory = coreExtension('Inventory', { cfg = {}, items = items, computed_items = {} }, nil, InventoryUser)

---@param value any
---@param args string[]
---@return any
local function computeValue(value, args)
    if type(value) == 'function' then return value(args) end
    return value
end

--- Defines an item for vRP 2 scripts (name, description and weight a value or `fn(args)`); `menu_builder(args, menu)`
--- fills the menu that opens when the item is used (the inventory item from the panel mapping must exist).
---@param id any
---@param name any
---@param description any
---@param menu_builder any
---@param weight any
function Inventory:defineItem(id, name, description, menu_builder, weight)
    if type(id) ~= 'string' or id == '' then return end
    local entry = { name = name, description = description, menu_builder = menu_builder, weight = weight, owner = V.owner() }
    items[id] = entry
    self.computed_items = {}
    V.track(function()
        if items[id] == entry then items[id] = nil end
        self.computed_items = {}
    end)
    local item = type(menu_builder) == 'function' and BridgeVRP.itemOf and BridgeVRP.itemOf(id)
    if not item then return end
    core:RegisterUsableItem(item, function(source)
        local user = vRP.users_by_source[tonumber(source) or -1]
        if user and items[id] == entry and V.alive(entry.owner) then user:openMenu(ITEM_MENU, { fullid = id }) end
        return false -- the menu's options take the item themselves (vRP's way)
    end)
end

---@param fullid any
---@return string[]
function Inventory:parseItem(fullid)
    return splitString(tostring(fullid or ''), '|')
end

--- `{ name, description, weight, menu_builder, args }` of an item (defined here, else the active inventory's).
---@param fullid any
---@return table|nil
function Inventory:computeItem(fullid)
    if type(fullid) ~= 'string' then return nil end
    local cached = self.computed_items[fullid]
    if cached then return cached end
    local args = self:parseItem(fullid)
    local own = items[args[1] or '']
    if own then
        local ok, name, description, weight = pcall(function()
            return computeValue(own.name, args), computeValue(own.description, args), computeValue(own.weight, args)
        end)
        if not ok then return nil end
        cached = {
            name = type(name) == 'string' and name or fullid,
            description = type(description) == 'string' and description or '',
            weight = tonumber(weight) or 0,
            menu_builder = own.menu_builder,
            args = args,
        }
        self.computed_items[fullid] = cached
        return cached
    end
    local name, description, weight = v1('getItemDefinition', nil, fullid)
    if not name then return nil end
    return { name = name, description = description or '', weight = tonumber(weight) or 0, args = args }
end

---@param list any fullid -> amount
---@return number
function Inventory:computeItemsWeight(list)
    local weight = 0
    for fullid, amount in pairs(type(list) == 'table' and list or {}) do
        local item = self:computeItem(fullid)
        weight = weight + (item and item.weight or 0) * (tonumber(amount) or 0)
    end
    return weight
end

V.items = items
V.itemMenu = ITEM_MENU
V.inventory = Inventory
