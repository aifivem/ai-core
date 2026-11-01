-- Items scripts add to QBCore.Shared (they stay in the bridge), QBCore.Functions.SetMethod / SetField and the
-- Shared updates a loading player gets.

local added = BridgeQB.added

---@param name string|nil
---@param value any
local function itemsChanged(name, value)
    if name then
        TriggerClientEvent('QBCore:Client:OnSharedUpdate', -1, 'Items', name, value)
    else
        TriggerClientEvent('QBCore:Client:OnSharedUpdateMultiple', -1, 'Items', value)
    end
    TriggerEvent('QBCore:Server:UpdateObject')
end

---@param name string
---@return boolean
local function itemExists(name) return added.Items[name] ~= nil or Bridge.itemDefinition(name) ~= nil end

function QBCore.Functions.AddItem(name, value)
    if type(name) ~= 'string' then return false, 'invalid_item_name' end
    if itemExists(name) then return false, 'item_exists' end
    added.Items[name] = value
    itemsChanged(name, value)
    return true, 'success'
end

function QBCore.Functions.AddItems(values)
    if type(values) ~= 'table' then return false, 'invalid_item_name' end
    for name, value in pairs(values) do
        if type(name) ~= 'string' then return false, 'invalid_item_name', value end
        if itemExists(name) then return false, 'item_exists', value end
    end
    for name, value in pairs(values) do added.Items[name] = value end
    itemsChanged(nil, values)
    return true, 'success', nil
end

-- The inventory's own items are changed in the inventory, never by a script.
function QBCore.Functions.UpdateItem(name, value)
    if type(name) ~= 'string' then return false, 'invalid_item_name' end
    if added.Items[name] == nil then return false, Bridge.itemDefinition(name) and 'item_managed_by_ai_core' or 'item_not_exists' end
    added.Items[name] = value
    itemsChanged(name, value)
    return true, 'success'
end

function QBCore.Functions.RemoveItem(name)
    if type(name) ~= 'string' then return false, 'invalid_item_name' end
    if added.Items[name] == nil then return false, Bridge.itemDefinition(name) and 'item_managed_by_ai_core' or 'item_not_exists' end
    added.Items[name] = nil
    itemsChanged(name, nil)
    return true, 'success'
end

--- Adds a function to QBCore.Functions (never replaces one).
---@param methodName string
---@param handler function
---@return boolean, string
function QBCore.Functions.SetMethod(methodName, handler)
    if type(methodName) ~= 'string' then return false, 'invalid_method_name' end
    if QBCore.Functions[methodName] ~= nil then return false, 'method_exists' end
    QBCore.Functions[methodName] = handler
    TriggerEvent('QBCore:Server:UpdateObject')
    return true, 'success'
end

--- Adds a field to QBCore (never replaces one).
---@param fieldName string
---@param data any
---@return boolean, string
function QBCore.Functions.SetField(fieldName, data)
    if type(fieldName) ~= 'string' then return false, 'invalid_field_name' end
    if QBCore[fieldName] ~= nil then return false, 'field_exists' end
    QBCore[fieldName] = data
    TriggerEvent('QBCore:Server:UpdateObject')
    return true, 'success'
end

-- The client half reads the inventory's item definitions and ai-core's jobs / gangs itself; only the items scripts
-- added here reach a loading player's client (once, latent).
local LATENT_BPS = 200000

Bridge.on('loaded', function(source)
    if next(added.Items) then TriggerLatentClientEvent('QBCore:Client:OnSharedUpdateMultiple', source, LATENT_BPS, 'Items', added.Items) end
end)

-- Another inventory became active: the server's core object reads its items again.
AddEventHandler('ai-core:inventoryChanged', function()
    TriggerEvent('QBCore:Server:UpdateObject')
end)
