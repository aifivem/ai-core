-- vRP 1 server API on ai-core, users: connection state, spawns, names, kicks and the per-user data tables.

local vRP = BridgeVRP.proxy

--- Dunko / vRP 0.5: whether the user_id has a loaded character.
---@param user_id any
---@return boolean
function vRP.isConnected(user_id)
    return BridgeVRP.sourceOf(user_id) ~= nil
end

--- Spawns of the character in this load (0 = not spawned yet, 1 = first spawn).
---@param user_id any
---@return integer
function vRP.getSpawns(user_id)
    local source = BridgeVRP.sourceOf(user_id)
    return source and BridgeVRP.spawns(source) or 0
end

---@param user_id any
---@return boolean
function vRP.isFirstSpawn(user_id)
    return vRP.getSpawns(user_id) == 1
end

---@param source any
---@return string
function vRP.getPlayerEndpoint(source)
    return GetPlayerEndpoint(tonumber(source) or -1) or '0.0.0.0'
end

---@param source any
---@return string
function vRP.getPlayerName(source)
    return GetPlayerName(tonumber(source) or -1) or 'unknown'
end

---@param source any
---@param reason any
function vRP.kick(source, reason)
    DropPlayer(tostring(source), tostring(reason or ''))
end

--- vRPex / Zirix: thousands separated with dots (`1.234.567`).
---@param n any
---@return string
function vRP.format(n)
    local left, num, right = string.match(tostring(n), '^([^%d]*%d)(%d*)(.-)$')
    if not left then return tostring(n) end
    return left .. (num:reverse():gsub('(%d%d%d)', '%1.'):reverse()) .. right
end

--- vRP's per-user data table, built at call time from ai-core (scripts get a copy through the proxy; writes never
--- persisted for them in vRP either): `inventory` (item -> { amount }), `groups` (name -> true), `hunger`, `thirst`
--- (0-100, 100 = starving), `health`, `position`, `weapons`, `customization` (empty).
---@param user_id any
---@return table|nil
function vRP.getUserDataTable(user_id)
    local _, source = BridgeVRP.mirror(user_id)
    if not source then return nil end
    local ped = GetPlayerPed(source)
    local coords = GetEntityCoords(ped)
    return {
        inventory = vRP.getInventory(user_id) or {},
        groups = vRP.getUserGroups(user_id),
        hunger = vRP.getHunger(user_id),
        thirst = vRP.getThirst(user_id),
        health = GetEntityHealth(ped),
        position = { x = coords.x, y = coords.y, z = coords.z },
        weapons = vRP.getWeapons(source),
        customization = {},
    }
end

--- vRP's per-load temporary table, built at call time: `wallet`, `bank`, `spawns`, `last_login`.
---@param user_id any
---@return table|nil
function vRP.getUserTmpTable(user_id)
    local mirror, source = BridgeVRP.mirror(user_id)
    if not mirror then return nil end
    return { wallet = mirror.money.cash or 0, bank = mirror.money.bank or 0, spawns = BridgeVRP.spawns(source), last_login = '' }
end
