-- vRP 1 server API on ai-core, inventory: every call goes through ai-core's inventory layer (the active inventory).
-- Signatures: vRP 1.0 `vrp/modules/inventory.lua` (same names in vRPex, Zirix, Dunko). vRP item ids map to inventory
-- items through the panel's `items` table (data/vrp.json), else: a plain name as it is, `wbody|WEAPON_X` = the weapon
-- item, other `a|b` = `b`; `wammo|...` needs a panel row (ammo items differ per inventory). Weights: inventories count
-- grams, vRP kilograms. Weapons are inventory items (owner decision): the server tunnel calls
-- `vRPclient.getWeapons / giveWeapons / replaceWeapons(source, ...)` are routed here by lib/Tunnel.lua.

local core = Bridge.core
local vRP = BridgeVRP.proxy

--- Max weight answered when the active inventory does not tell it (kg): large, so the inventory itself decides.
local UNKNOWN_MAX_WEIGHT = 100000

-- Item ids -----------------------------------------------------------------------------------------------------------

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

-- Item definitions ---------------------------------------------------------------------------------------------------

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
        local ui = BridgeVRP.ui --[[@as table|nil]] -- bridge/vrp/ui.lua
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

-- Player inventory ---------------------------------------------------------------------------------------------------

--- A whole amount above 0, else nil.
---@param value any
---@return integer|nil
local function countOf(value)
    local n = tonumber(value)
    if not n or n ~= n or n == math.huge or n < 1 then return nil end
    return math.floor(n)
end

--- Gives an item (vRP's `notify` text is not shown: the inventory shows its own changes).
---@param user_id any
---@param idname any
---@param amount any
---@return boolean
function vRP.giveInventoryItem(user_id, idname, amount)
    local _, source = BridgeVRP.mirror(user_id)
    local item, count = BridgeVRP.itemOf(idname), countOf(amount)
    if not source or not item or not count then return false end
    return core:AddItem(source, item, count) == true
end

--- Takes an item only when the character holds enough.
---@param user_id any
---@param idname any
---@param amount any
---@return boolean
function vRP.tryGetInventoryItem(user_id, idname, amount)
    local _, source = BridgeVRP.mirror(user_id)
    local item, count = BridgeVRP.itemOf(idname), countOf(amount)
    if not source or not item or not count then return false end
    if (core:GetItemCount(source, item) or 0) < count then return false end
    return core:RemoveItem(source, item, count) == true
end

---@param user_id any
---@param idname any
---@return integer
function vRP.getInventoryItemAmount(user_id, idname)
    local _, source = BridgeVRP.mirror(user_id)
    local item = BridgeVRP.itemOf(idname)
    if not source or not item then return 0 end
    return core:GetItemCount(source, item) or 0
end

--- `{ [idname] = { amount } }` of every item the character carries; nil when the character is not loaded.
---@param user_id any
---@return table<string, { amount: integer }>|nil
function vRP.getInventory(user_id)
    local _, source = BridgeVRP.mirror(user_id)
    if not source then return nil end
    local out = {}
    for _, stack in ipairs(core:GetItems(source) or {}) do
        local id = idOf(stack.name)
        local entry = out[id]
        if entry then entry.amount = entry.amount + stack.count else out[id] = { amount = stack.count } end
    end
    return out
end

---@param source integer
---@return { weight: number, maxWeight: number }|nil grams
local function weightOf(source)
    local answer = core:GetInventoryWeight(source)
    if type(answer) == 'table' and type(answer.weight) == 'number' and type(answer.maxWeight) == 'number' then return answer end
    return nil
end

--- Carried weight in kg.
---@param user_id any
---@return number
function vRP.getInventoryWeight(user_id)
    local _, source = BridgeVRP.mirror(user_id)
    if not source then return 0 end
    local answer = weightOf(source)
    if answer then return answer.weight / 1000 end
    return vRP.computeItemsWeight(vRP.getInventory(user_id))
end

--- Weight limit in kg (a large number when the active inventory does not tell it).
---@param user_id any
---@return number
function vRP.getInventoryMaxWeight(user_id)
    local _, source = BridgeVRP.mirror(user_id)
    if not source then return 0 end
    local answer = weightOf(source)
    return answer and answer.maxWeight / 1000 or UNKNOWN_MAX_WEIGHT
end

---@param user_id any
function vRP.clearInventory(user_id)
    local _, source = BridgeVRP.mirror(user_id)
    if source then core:ClearInventory(source) end
end

---@type table<string, integer> stash -> registered max weight (grams); ai-core keeps stashes across inventory restarts
local stashes = {}

--- Opens a chest as an inventory stash `vrp_<name>` (`max_weight` in kg). `cb_close`, `cb_in`, `cb_out` are not
--- called: the inventory layer has no per-stash move hook.
---@param source any
---@param name any
---@param max_weight any
function vRP.openChest(source, name, max_weight)
    source = tonumber(source)
    if not source or not Bridge.players[source] or type(name) ~= 'string' or name == '' then return end
    local stash = 'vrp_' .. name
    local grams = math.floor((tonumber(max_weight) or 100) * 1000)
    if stashes[stash] ~= grams then
        stashes[stash] = grams
        core:RegisterStash(stash, name, 50, grams)
    end
    core:OpenInventory(source, stash)
end

-- Weapons (inventory items) ------------------------------------------------------------------------------------------

--- `{ [WEAPON_X] = { ammo } }` of the weapon items a player carries (vRP's `getWeapons` shape).
---@param source any
---@return table<string, { ammo: integer }>
function vRP.getWeapons(source)
    local out = {}
    source = tonumber(source)
    if not source or not Bridge.players[source] then return out end
    for _, stack in ipairs(core:GetItems(source) or {}) do
        if isWeapon(stack.name) then
            local metadata = type(stack.metadata) == 'table' and stack.metadata or {}
            out[stack.name:upper()] = { ammo = math.floor(tonumber(metadata.ammo) or 0) }
        end
    end
    return out
end

--- Gives the weapon items a player does not carry yet (`{ [WEAPON_X] = { ammo } }`; ammo goes into the item's
--- metadata); `clear_before` takes every weapon item first.
---@param source any
---@param weapons any
---@param clear_before any
function vRP.giveWeapons(source, weapons, clear_before)
    source = tonumber(source)
    if not source or not Bridge.players[source] then return end
    if clear_before then
        for _, stack in ipairs(core:GetItems(source) or {}) do
            if isWeapon(stack.name) then core:RemoveItem(source, stack.name, stack.count, nil, stack.slot) end
        end
    end
    if type(weapons) ~= 'table' then return end
    for name, weapon in pairs(weapons) do
        if type(name) == 'string' and isWeapon(name) then
            local item = weaponItem(name)
            if (core:GetItemCount(source, item) or 0) == 0 then
                local ammo = type(weapon) == 'table' and math.floor(tonumber(weapon.ammo) or 0) or 0
                core:AddItem(source, item, 1, ammo > 0 and { ammo = ammo } or nil)
            end
        end
    end
end

--- Gives `weapons` in place of the carried weapon items; returns the weapons carried before.
---@param source any
---@param weapons any
---@return table<string, { ammo: integer }>
function vRP.replaceWeapons(source, weapons)
    local old = vRP.getWeapons(source)
    vRP.giveWeapons(source, weapons, true)
    return old
end
