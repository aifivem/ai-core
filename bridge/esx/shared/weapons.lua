-- ESX on ai-core, both sides: ESX's weapon lookups (es_extended 1.16.3 shared/modules/weapons.lua, GPL-3.0) over its
-- weapon list (bridge/esx/data/weapons.lua).

---@class ESXWeaponComponent
---@field name string
---@field label string
---@field hash integer

---@class ESXWeapon
---@field name string
---@field label string
---@field components ESXWeaponComponent[]
---@field ammo? { label: string, hash: integer }
---@field tints? table<integer, string>
---@field throwable? boolean

---@class ESXWeaponConfig
---@field Weapons ESXWeapon[]
---@field DefaultWeaponTints table<integer, string>
---@field MK2WeaponTints table<integer, string>

---@type ESXWeaponConfig|nil
local weaponConfig
---@type table<string, integer>
local weaponsByName = {}
---@type table<integer, ESXWeapon>
local weaponsByHash = {}

--- ESX's weapon list with English labels (bridge/esx/data/weapons.lua), read on the first weapon lookup. Also the source of
--- `Weapons`, `DefaultWeaponTints` and `MK2WeaponTints` in both sides' `ESX.GetConfig()`.
---@return ESXWeaponConfig
function BridgeESXWeapons()
    if weaponConfig then return weaponConfig end
    local path = 'bridge/esx/data/weapons.lua'
    local chunk, err = load(LoadResourceFile(GetCurrentResourceName(), path) or 'return {}', ('@@ai-core/%s'):format(path))
    if not chunk then error(err) end
    local config = chunk() or {}
    config.Weapons = config.Weapons or {}
    for index, weapon in ipairs(config.Weapons) do
        weaponsByName[weapon.name] = index
        weaponsByHash[joaat(weapon.name)] = weapon
    end
    weaponConfig = config --[[@as ESXWeaponConfig]]
    return weaponConfig
end

---@param weaponName string
---@return integer
local function weaponIndex(weaponName)
    BridgeESXWeapons()
    local index = weaponsByName[string.upper(weaponName)]
    assert(index, 'Invalid weapon name!')
    return index
end

---@param weaponName string
---@return integer, ESXWeapon
function ESX.GetWeapon(weaponName)
    local index = weaponIndex(weaponName)
    return index, BridgeESXWeapons().Weapons[index]
end

---@param weaponHash integer|string
---@return ESXWeapon|nil
function ESX.GetWeaponFromHash(weaponHash)
    BridgeESXWeapons()
    return weaponsByHash[type(weaponHash) == 'string' and joaat(weaponHash) or weaponHash]
end

---@param byHash? boolean
---@return ESXWeapon[]|table<integer, ESXWeapon>
function ESX.GetWeaponList(byHash)
    local config = BridgeESXWeapons()
    return byHash and weaponsByHash or config.Weapons
end

---@param weaponName string
---@return string
function ESX.GetWeaponLabel(weaponName)
    return BridgeESXWeapons().Weapons[weaponIndex(weaponName)].label or ''
end

---@param weaponName string
---@param weaponComponent string
---@return ESXWeaponComponent|nil
function ESX.GetWeaponComponent(weaponName, weaponComponent)
    local weapon = BridgeESXWeapons().Weapons[weaponIndex(weaponName)]
    for _, component in ipairs(weapon.components or {}) do
        if component.name == weaponComponent then return component end
    end
end
