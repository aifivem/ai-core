-- qbx_core's core object, version, notify, usable items and unique identifiers.

local core = Bridge.core
local provide = BridgeQbox.provide

-- Items.

provide('CreateUseableItem', function(name, cb) QBCore.Functions.CreateUseableItem(name, cb) end)
--- Qbox answers the callback itself (ox_inventory calls it with `(source, item)`).
provide('CanUseItem', function(name)
    if not core:IsUsableItem(name) then return nil end
    return function(source, item) return Bridge.useItem(source, name, item) end
end)

--- Qbox's title / description pair: the title shows above the text on ai-lib's card.
provide('Notify', function(source, text, kind, duration, subTitle)
    local heading, description = BridgeQbox.notifyParts(text, subTitle)
    Bridge.notify(source, description or heading or '', kind, duration, description and heading or nil)
end)
provide('GetCoreObject', function() return BridgeQB.coreObject() end)
provide('GetCoreVersion', function() return BridgeQbox.VERSION end)

---@type table<string, fun(): string|integer>
local UNIQUE = {
    citizenid = function() return QBCore.Player.CreateCitizenId() end,
    AccountNumber = function() return QBCore.Functions.CreateAccountNumber() end,
    PhoneNumber = function() return QBCore.Functions.CreatePhoneNumber() end,
    FingerId = function() return QBCore.Player.CreateFingerId() end,
    WalletId = function() return QBCore.Player.CreateWalletId() end,
    SerialNumber = function() return QBCore.Player.CreateSerialNumber() end,
}

--- A value in the shape of Qbox's unique identifiers (not checked against stored characters).
provide('GenerateUniqueIdentifier', function(kind)
    local generate = UNIQUE[kind]
    return generate and generate() or QBCore.Shared.RandomStr(8)
end)
