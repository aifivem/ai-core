-- ESX on ai-core, server side: ESX.GetConfig (ai-core's fixed ESX config and ESX's weapon tables) and ESX.Trace.

---@param key? string
function ESX.GetConfig(key)
    local config = { Locale = GetConvar('esx:locale', 'en'), EnableDebug = false, CustomInventory = true, Multichar = true, DistanceGive = 4.0, DefaultJobDuty = true }
    -- ESX's weapon tables (bridge/esx/shared/weapons.lua), loaded only when asked for.
    if key == 'Weapons' or key == 'DefaultWeaponTints' or key == 'MK2WeaponTints' then return BridgeESXWeapons()[key] end
    if key then return config[key] end
    local weapons = BridgeESXWeapons()
    config.Weapons, config.DefaultWeaponTints, config.MK2WeaponTints = weapons.Weapons, weapons.DefaultWeaponTints, weapons.MK2WeaponTints
    return config
end

---@param msg string
function ESX.Trace(msg)
    if ESX.GetConfig('EnableDebug') then print(('[^2TRACE^7] %s^7'):format(msg)) end
end
