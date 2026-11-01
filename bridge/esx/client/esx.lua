-- ESX on ai-core, client side: creates `ESX` (es_extended's client shared object, `esx:getSharedObject` and the
-- `getSharedObject` export) and `BridgeESXClient` (the ESX part's namespace); the other files under bridge/esx/client/
-- add to them. Player data, inventory, callbacks, game helpers, UI and events are fired locally from the bridge
-- mirror (bridge/core/client/).

---@class ESXClient
---@field Math table ESX.Math (bridge/esx/shared/math.lua)
---@field Table table ESX.Table (bridge/esx/shared/table.lua)
---@field PlayerData ESXClientPlayerData|table
ESX = { PlayerData = {}, PlayerLoaded = false, Game = {}, UI = {} }

BridgeESXClient = {}

--- Config keys read from ESX's weapon list (loaded only when asked for).
local weaponKeys = { Weapons = true, DefaultWeaponTints = true, MK2WeaponTints = true }

---@param key? string
---@return any
function ESX.GetConfig(key)
    local config = {
        Locale = GetConvar('esx:locale', 'en'),
        EnableDebug = false,
        CustomInventory = true,
        EnableDefaultInventory = false,
        Multichar = true,
        Identity = true,
        ValidCharacterSets = {},
    }
    if key and not weaponKeys[key] then return config[key] end
    local weapons = BridgeESXWeapons()
    config.Weapons, config.DefaultWeaponTints, config.MK2WeaponTints = weapons.Weapons, weapons.DefaultWeaponTints, weapons.MK2WeaponTints
    if key then return config[key] end
    return config
end

--- A net event only the server may trigger (ESX's SecureNetEvent).
---@param name string
---@param cb function
function ESX.SecureNetEvent(name, cb)
    RegisterNetEvent(name, function(...)
        if GetInvokingResource() ~= nil and GetInvokingResource() ~= 'ai-core' then return end
        cb(...)
    end)
end

AddEventHandler('esx:getSharedObject', function(cb)
    if BridgeUI.isCallable(cb) then cb(ESX) end
end)
BridgeClient.provideExport('es_extended', 'getSharedObject', function() return ESX end)
