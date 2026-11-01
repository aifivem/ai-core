-- ESX on ai-core, server side: the xPlayer's inventory methods (added by build.lua), on ai-core's inventory layer.

local core = Bridge.core
local inventoryOf = BridgeESX.inventoryOf

---@param self table the xPlayer being built
---@param source integer
function BridgeESX.xPlayerInventory(self, source)
    -- Inventory (ai-core's inventory layer)
    function self.getInventory(minimal)
        self.inventory = inventoryOf(source)
        if not minimal then return self.inventory end
        local out = {}
        for _, item in ipairs(self.inventory) do out[item.name] = (out[item.name] or 0) + item.count end
        return out
    end
    function self.getInventoryItem(item, metadata)
        local definition = Bridge.itemDefinition(item)
        return {
            name = item,
            label = definition and definition.label or item,
            count = core:GetItemCount(source, item, metadata) or 0,
            weight = definition and definition.weight or 0,
            usable = core:IsUsableItem(item) == true,
            rare = false,
            canRemove = true,
        }
    end
    function self.hasItem(item, metadata)
        local found = self.getInventoryItem(item, metadata)
        if found.count < 1 then return false end
        return found, found.count
    end
    function self.addInventoryItem(item, count, metadata, slot)
        local ok = core:AddItem(source, item, count or 1, metadata, slot)
        if ok then TriggerEvent('esx:onAddInventoryItem', source, item, core:GetItemCount(source, item)) end
        return ok
    end
    function self.removeInventoryItem(item, count, metadata, slot)
        local ok = core:RemoveItem(source, item, count or 1, metadata, slot)
        if ok then TriggerEvent('esx:onRemoveInventoryItem', source, item, core:GetItemCount(source, item)) end
        return ok
    end
    function self.setInventoryItem(item, count, metadata)
        count = tonumber(count)
        if type(item) ~= 'string' or not count or count < 0 then return false end
        count = math.floor(count)
        local have = core:GetItemCount(source, item, metadata) or 0
        if count > have then return self.addInventoryItem(item, count - have, metadata) end
        if count < have then return self.removeInventoryItem(item, have - count, metadata) end
    end
    function self.canCarryItem(item, count, metadata) return core:CanCarryItem(source, item, count or 1, metadata) == true end
    function self.canSwapItem(firstItem, firstItemCount, testItem, testItemCount)
        if (core:GetItemCount(source, firstItem) or 0) < firstItemCount then return false end
        local w = core:GetInventoryWeight(source)
        local first, test = Bridge.itemDefinition(firstItem), Bridge.itemDefinition(testItem)
        if not w or not first or not test then return core:CanCarryItem(source, testItem, testItemCount) == true end
        return w.weight - first.weight * firstItemCount + test.weight * testItemCount <= w.maxWeight
    end
    function self.getWeight()
        local w = core:GetInventoryWeight(source)
        self.weight = w and w.weight or 0
        return self.weight
    end
    function self.getMaxWeight()
        local w = core:GetInventoryWeight(source)
        self.maxWeight = w and w.maxWeight or 0
        return self.maxWeight
    end
    --- The carry limit in grams through ai-core's inventory layer (until the inventory reloads it); false when the
    --- inventory has no way to change it.
    function self.setMaxWeight(newWeight)
        local grams = tonumber(newWeight)
        if not grams or grams ~= grams or grams < 0 or grams == math.huge then return false end
        grams = math.floor(grams)
        if core:SetMaxWeight(source, grams) ~= true then return false end
        self.maxWeight = grams
        self.triggerEvent('esx:setMaxWeight', grams)
        return true
    end
    --- ox_inventory's ESX sync: keeps the reported values on the xPlayer.
    function self.syncInventory(weight, maxWeight, items)
        self.weight, self.maxWeight, self.inventory = weight, maxWeight, items
    end
end
