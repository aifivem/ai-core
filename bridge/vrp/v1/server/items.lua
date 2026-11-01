-- vRP 1 server API on ai-core, inventory: every call goes through ai-core's inventory layer (the active inventory).
-- Signatures: vRP 1.0 `vrp/modules/inventory.lua` (same names in vRPex, Zirix, Dunko). vRP item ids map to inventory
-- items through the panel's `items` table (data/vrp.json), else: a plain name as it is, `wbody|WEAPON_X` = the weapon
-- item, other `a|b` = `b`; `wammo|...` needs a panel row (ammo items differ per inventory). Weights: inventories count
-- grams, vRP kilograms. Weapons are inventory items (owner decision): the server tunnel calls
-- `vRPclient.getWeapons / giveWeapons / replaceWeapons(source, ...)` are routed here by lib/Tunnel.lua.

local core = Bridge.core
local vRP = BridgeVRP.proxy

--- The inventory item of a weapon name, in the case the active inventory defines it (`WEAPON_PISTOL` / `weapon_pistol`).
---@param weapon string
---@return string
local function weaponItem(weapon)
    if Bridge.itemDefinition(weapon) then return weapon end
    local lower, upper = weapon:lower(), weapon:upper()
    if Bridge.itemDefinition(lower) then return lower end
    if Bridge.itemDefinition(upper) then return upper end
    return weapon
end

---@param name string
---@return boolean
local function isWeapon(name)
    return name:upper():sub(1, 7) == 'WEAPON_'
end

--- The inventory item of a vRP item id; nil when it has none (unmapped ammo).
---@param idname any
---@return string|nil
function BridgeVRP.itemOf(idname)
    if type(idname) ~= 'string' or idname == '' then return nil end
    local mapped = BridgeVRP.config().items[idname]
    if mapped then return mapped end
    local kind, arg = idname:match('^([^|]+)|(.+)$')
    if not kind then return isWeapon(idname) and weaponItem(idname) or idname end
    if kind == 'wammo' then
        BridgeVRP.warnOnce('item:' .. idname, ('item %s has no inventory item: map it in the panel (vRP, items)'):format(idname))
        return nil
    end
    if kind == 'wbody' then return weaponItem(arg) end
    return arg
end

--- The vRP id scripts know for an inventory item (the panel's `items` row, else the item name).
---@type table<string, string>|nil
local idOfItem

---@param item string
---@return string
local function idOf(item)
    if not idOfItem then
        idOfItem = {}
        for id, mapped in pairs(BridgeVRP.config().items) do
            if idOfItem[mapped] == nil then idOfItem[mapped] = id end
        end
    end
    return idOfItem[item] or item
end
BridgeVRP.onConfig(function() idOfItem = nil end)

--- Items scripts define with `defInventoryItem` (name, description, choices, weight): used when the inventory has no
--- definition, and for the choices menu when the item is used. They go when their resource stops.
---@type table<string, { name: any, description: any, choices: any, weight: any, owner: string }>
local defined = {}

---@param idname string
---@return string[] args vRP's `parseItem`
local function parse(idname)
    return splitString(idname, '|')
end

--- A value of a script's item definition: a plain value, or a function of the parsed id.
---@param value any
---@param args string[]
---@return any
local function compute(value, args)
    if BridgeVRP.isCallable(value) then return BridgeVRP.call(value, args) end
    return value
end

---@param idname any
---@return string
function vRP.getItemName(idname)
    if type(idname) ~= 'string' then return tostring(idname) end
    local item = BridgeVRP.itemOf(idname)
    local definition = item and Bridge.itemDefinition(item)
    if definition then return definition.label end
    local args = parse(idname)
    local own = defined[args[1] or '']
    local name = own and compute(own.name, args)
    return type(name) == 'string' and name or (args[1] or idname)
end

---@param idname any
---@return string
function vRP.getItemDescription(idname)
    if type(idname) ~= 'string' then return '' end
    local item = BridgeVRP.itemOf(idname)
    local definition = item and Bridge.itemDefinition(item)
    if definition then return definition.description or '' end
    local args = parse(idname)
    local own = defined[args[1] or '']
    local description = own and compute(own.description, args)
    return type(description) == 'string' and description or ''
end

--- Weight of one item in kg.
---@param idname any
---@return number
function vRP.getItemWeight(idname)
    if type(idname) ~= 'string' then return 0 end
    local item = BridgeVRP.itemOf(idname)
    local definition = item and Bridge.itemDefinition(item)
    if definition then return (tonumber(definition.weight) or 0) / 1000 end
    local args = parse(idname)
    local own = defined[args[1] or '']
    return own and tonumber(compute(own.weight, args)) or 0
end

--- name, description, weight; nil, nil, nil for an unknown item.
---@param idname any
---@return string|nil
---@return string|nil
---@return number|nil
function vRP.getItemDefinition(idname)
    if type(idname) ~= 'string' then return nil, nil, nil end
    local item = BridgeVRP.itemOf(idname)
    if not (item and Bridge.itemDefinition(item)) and not defined[parse(idname)[1] or ''] then return nil, nil, nil end
    return vRP.getItemName(idname), vRP.getItemDescription(idname), vRP.getItemWeight(idname)
end

---@param idname any
---@return string[]
function vRP.parseItem(idname)
    return splitString(tostring(idname or ''), '|')
end

--- Weight of `{ [idname] = { amount } }` in kg.
---@param items any
---@return number
function vRP.computeItemsWeight(items)
    local weight = 0
    if type(items) ~= 'table' then return weight end
    for idname, entry in pairs(items) do
        weight = weight + vRP.getItemWeight(idname) * (type(entry) == 'table' and tonumber(entry.amount) or 0)
    end
    return weight
end

--- Registers a script item: its use opens its choices (`choices(args)` -> `{ [label] = { fn(player, choice), desc } }`)
--- in a vRP menu; the item must exist in the active inventory.
---@param idname any
---@param name any
---@param description any
---@param choices any
---@param weight any
function vRP.defInventoryItem(idname, name, description, choices, weight)
    if type(idname) ~= 'string' or idname == '' then return end
    defined[idname] = { name = name, description = description, choices = choices, weight = weight or 0, owner = BridgeVRP.caller() }
    if not BridgeVRP.isCallable(choices) then return end
    local item = BridgeVRP.itemOf(idname)
    if not item then return end
    core:RegisterUsableItem(item, function(source)
        local own = defined[idname]
        if not own or not BridgeVRP.isCallable(own.choices) then return false end
        local args = parse(idname)
        local menu = BridgeVRP.call(own.choices, args)
        local ui = BridgeVRP.ui --[[@as table|nil]] -- bridge/vrp/server/gui/
        if type(menu) ~= 'table' or not (ui and ui.openMenu) then return false end
        local label = compute(own.name, args)
        menu.name = type(label) == 'string' and label or idname
        ui.openMenu(source, menu, own.owner)
        return false -- the choices take the item themselves (vRP's way)
    end)
end

AddEventHandler('onResourceStop', function(resource)
    for idname, entry in pairs(defined) do
        if entry.owner == resource then defined[idname] = nil end
    end
end)

BridgeVRP.weaponItem = weaponItem
BridgeVRP.isWeapon = isWeapon
BridgeVRP.idOf = idOf
