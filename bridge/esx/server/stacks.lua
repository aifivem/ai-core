-- ESX on ai-core, server side: a player's inventory stacks (ai-core's inventory layer) in ESX's inventory and loadout
-- shapes.

local core = Bridge.core

---@class ESXInventoryItem
---@field name string
---@field label string
---@field count number
---@field weight number
---@field usable boolean
---@field rare boolean
---@field canRemove boolean
---@field slot? integer
---@field metadata? table

---@class ESXInventoryWeapon
---@field name string
---@field label string
---@field ammo number
---@field components string[]
---@field tintIndex number

---@param name string
---@return boolean
local function isWeaponName(name) return type(name) == 'string' and name:upper():sub(1, 7) == 'WEAPON_' end

--- The inventory's item name for an ESX weapon name (`WEAPON_PISTOL`, `weapon_pistol`), nil when it has no such item.
---@param name string
---@return string|nil
local function weaponItem(name)
    if not isWeaponName(name) then return nil end
    for _, candidate in ipairs({ name, name:upper(), name:lower() }) do
        if Bridge.itemDefinition(candidate) then return candidate end
    end
end

---@param source integer
---@return ESXInventoryWeapon[] loadout, table[] stacks the weapon stacks, same order
local function loadoutOf(source)
    local out, stacks = {}, {}
    for _, stack in ipairs(core:GetItems(source) or {}) do
        if isWeaponName(stack.name) then
            local meta = type(stack.metadata) == 'table' and stack.metadata or {}
            out[#out + 1] = {
                name = stack.name:upper(),
                label = stack.label,
                ammo = tonumber(meta.ammo) or 0,
                components = type(meta.components) == 'table' and meta.components or {},
                tintIndex = tonumber(meta.tint) or 0,
            }
            stacks[#stacks + 1] = stack
        end
    end
    return out, stacks
end

---@param source integer
---@return ESXInventoryItem[]
local function inventoryOf(source)
    local out = {}
    for _, stack in ipairs(core:GetItems(source) or {}) do
        local definition = Bridge.itemDefinition(stack.name)
        out[#out + 1] = {
            name = stack.name, label = stack.label, count = stack.count, slot = stack.slot, metadata = stack.metadata,
            weight = definition and definition.weight or 0, usable = true, rare = false, canRemove = true,
        }
    end
    return out
end

BridgeESX.weaponItem, BridgeESX.loadoutOf, BridgeESX.inventoryOf = weaponItem, loadoutOf, inventoryOf
