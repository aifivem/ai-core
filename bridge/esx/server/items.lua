-- ESX on ai-core, server side: ESX's item functions and ESX.Items on ai-core's inventory layer, and the item use,
-- give and ammo events of ESX inventory menus.

local core = Bridge.core
local xPlayers, warnOnce = BridgeESX.xPlayers, BridgeESX.warnOnce
local aiAccount, loadoutOf, getPlayerFromId = BridgeESX.aiAccount, BridgeESX.loadoutOf, BridgeESX.getPlayerFromId

---@param name string
---@param cb fun(source: integer, item?: table)
function ESX.RegisterUsableItem(name, cb)
    core:RegisterUsableItem(name, function(source, item) cb(source, item and item.name, item) end)
end

--- Called by the inventory (ox_inventory, tgiann-inventory) when a player uses an item.
---@param source integer
---@param item string
function ESX.UseItem(source, item, ...)
    Bridge.useItem(source, item, ...)
end

--- Every item a use handler is registered for (ai-core `GetUsableItems`, one call).
---@return table<string, boolean>
function ESX.GetUsableItems()
    local out = {}
    for _, name in ipairs(core:GetUsableItems() or {}) do out[name] = true end
    return out
end

---@param name string
---@return string
function ESX.GetItemLabel(name)
    local definition = Bridge.itemDefinition(name)
    return definition and definition.label or name
end

---@return table<string, { label: string, weight: number, rare: boolean, canRemove: boolean }>
function ESX.GetItems() return ESX.Items end

--- ESX.Items from the active inventory's item definitions; the number of items.
---@return integer
function ESX.RefreshItems()
    local items, count = {}, 0
    for name, definition in pairs(Bridge.itemDefinitions()) do
        items[name] = { label = definition.label, weight = definition.weight, rare = false, canRemove = true }
        count = count + 1
    end
    ESX.Items = items
    return count
end

--- Items are the inventory's own definitions on ai-core; a script cannot add one here.
---@param items table[]
function ESX.AddItems(items)
    local _ = items
    warnOnce('AddItems', ('ESX.AddItems from %s is not answered: add the items in the inventory.'):format(GetInvokingResource() or '?'))
end

--- ai-core has no ESX ground pickups (drops belong to the inventory): no pickup is made.
---@return integer|nil pickupId
function ESX.CreatePickup(...)
    local _ = ...
    warnOnce('CreatePickup', ('ESX.CreatePickup from %s is not answered: drops are made by the inventory.'):format(GetInvokingResource() or '?'))
    return nil
end

-- Item use and give from ESX inventory menus (ai-core's inventory gate rules: rate, loaded players, distance, counts).
aiLib.onClientEvent('esx:useItem', function(src, itemName)
    if type(itemName) ~= 'string' or #itemName > 100 or not Bridge.players[src] then return end
    if (core:GetItemCount(src, itemName) or 0) < 1 then return end
    Bridge.useItem(src, itemName)
end, { rate = { count = 5, windowMs = 1000 } })

---@param value any
---@return integer|nil
local function positiveCount(value)
    value = tonumber(value)
    if not value or value ~= value or value < 1 or value > 1000000 then return nil end
    return math.floor(value)
end

aiLib.onClientEvent('esx:giveInventoryItem', function(src, target, itemType, itemName, itemCount)
    target = tonumber(target)
    if not target or target == src or type(itemName) ~= 'string' or itemName == '' or #itemName > 100 then return end
    if not Bridge.players[src] or not Bridge.players[target] then return end
    local from, to = GetPlayerPed(tostring(src)), GetPlayerPed(tostring(target))
    if from == 0 or to == 0 or GetPlayerRoutingBucket(tostring(src)) ~= GetPlayerRoutingBucket(tostring(target)) then return end
    if #(GetEntityCoords(from) - GetEntityCoords(to)) > 4.0 then return end
    if itemType == 'item_standard' then
        local count = positiveCount(itemCount)
        if not count or (core:GetItemCount(src, itemName) or 0) < count or not core:CanCarryItem(target, itemName, count) then return end
        if not core:RemoveItem(src, itemName, count) then return end
        if not core:AddItem(target, itemName, count) then core:AddItem(src, itemName, count) end
    elseif itemType == 'item_account' then
        local count = positiveCount(itemCount)
        if not count or (itemName ~= 'money' and itemName ~= 'black_money') then return end
        core:TransferMoney({ source = src, account = aiAccount(itemName) }, { source = target, account = aiAccount(itemName) }, count, 'esx give')
    elseif itemType == 'item_weapon' then
        local x = getPlayerFromId(src)
        local index = x and x.getWeapon(itemName)
        if not index then return end
        local _, stacks = loadoutOf(src)
        local stack = stacks[index]
        if not stack or not core:CanCarryItem(target, stack.name, 1, stack.metadata) then return end
        if not core:RemoveItem(src, stack.name, 1, stack.metadata, stack.slot) then return end
        if not core:AddItem(target, stack.name, 1, stack.metadata) then core:AddItem(src, stack.name, 1, stack.metadata) end
    end
end, { rate = { count = 3, windowMs = 1000 } })

-- ESX's own ammo sync (es_extended's client reports the ammo left): only a weapon the player holds, never more ammo
-- than its item has.
aiLib.onClientEvent('esx:updateWeaponAmmo', function(src, weaponName, ammo)
    ammo = tonumber(ammo)
    if type(weaponName) ~= 'string' or #weaponName > 64 or not ammo or ammo < 0 or ammo > 100000 or ammo ~= math.floor(ammo) then return end
    local x = xPlayers[src]
    if not x then return end
    local _, weapon = x.getWeapon(weaponName)
    if not weapon or ammo > weapon.ammo then return end
    x.updateWeaponAmmo(weaponName, ammo)
end, { rate = { count = 10, windowMs = 1000 } })

-- Another inventory, an edited definition or the same inventory restarted (bridge/core/server/items.lua drops its list first).
AddEventHandler('ai-core:inventoryChanged', function() ESX.RefreshItems() end)
AddEventHandler('ai-core:itemDefinitionsChanged', function() ESX.RefreshItems() end)
AddEventHandler('onResourceStart', function(resource)
    if resource == GlobalState['ai:inventory'] then ESX.RefreshItems() end
end)

CreateThread(function()
    ESX.RefreshItems()
end)
