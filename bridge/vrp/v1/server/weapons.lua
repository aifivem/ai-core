-- vRP 1 server API on ai-core, weapons: inventory items (owner decision); the server tunnel calls
-- `vRPclient.getWeapons / giveWeapons / replaceWeapons(source, ...)` are routed here by lib/Tunnel.lua.

local core = Bridge.core
local vRP = BridgeVRP.proxy
local weaponItem, isWeapon = BridgeVRP.weaponItem, BridgeVRP.isWeapon

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
