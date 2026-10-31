-- vRP 1 server API on ai-core, base: the panel's vRP mapping, user helpers, user / tmp data tables, UData / SData and
-- vRP's DB API (`prepare` / `query` / `execute` / `scalar`). Signatures: vRP 1.0 `vrp/base.lua`, vRPex / Zirix
-- `vrp/base.lua`, vRP 0.5 / Dunko `vrp/base.lua` (`isConnected`, `isFirstSpawn`, `getPlayerName`).
-- v1 `user_id` = ai-core character id; data of a character that is not loaded answers like vRP's (nil / 0 / false).

local core = Bridge.core
local vRP = BridgeVRP.proxy

---@class VrpPermissionRule
---@field permission string exact, or a prefix when it ends with `*`
---@field job string
---@field gang string
---@field group string an extra vRP group
---@field grade integer minimum job / gang grade
---@field onDuty boolean
---@field admin boolean
---@field everyone boolean

---@class VrpGroupAlias
---@field job string
---@field gang string
---@field grade integer
---@field admin boolean

---@class VrpConfig the panel's vRP mapping (`VrpConfig` in @aicore-fivem/shared vrp.ts)
---@field defaults { jobPrefix: boolean, jobOnDuty: boolean, adminPrefix: boolean, playerPrefix: boolean }
---@field permissions VrpPermissionRule[]
---@field groups table<string, VrpGroupAlias>
---@field items table<string, string>

---@type VrpConfig
local config = core:GetVrpConfig() or { defaults = {}, permissions = {}, groups = {}, items = {} }
---@type fun(config: VrpConfig)[]
local configListeners = {}

--- The panel's vRP mapping (`data/vrp.json`: permissions, group and item aliases), kept current.
---@return VrpConfig
function BridgeVRP.config()
    return config
end

--- Runs `fn(config)` after each panel change of the vRP mapping.
---@param fn fun(config: VrpConfig)
function BridgeVRP.onConfig(fn)
    configListeners[#configListeners + 1] = fn
end

AddEventHandler('ai-core:vrp:config', function(next)
    if GetInvokingResource() and GetInvokingResource() ~= 'ai-core' then return end
    if type(next) ~= 'table' then return end
    config = next
    for i = 1, #configListeners do
        local ok, err = pcall(configListeners[i], next)
        if not ok then print(('^1[vRP] config listener failed: %s^0'):format(err)) end
    end
end)

--- The mirror and source of a loaded character (v1 user_id); nil when it is not loaded.
---@param userId any
---@return BridgeMirror|nil mirror
---@return integer|nil source
function BridgeVRP.mirror(userId)
    local source = BridgeVRP.sourceOf(userId)
    local mirror = source and Bridge.players[source]
    if not mirror then return nil, nil end
    return mirror, source
end

--- A Lua function or a function reference from another resource (msgpack turns those into callable tables).
---@param value any
---@return boolean
function BridgeVRP.isCallable(value)
    if type(value) == 'function' then return true end
    local meta = type(value) == 'table' and getmetatable(value)
    return meta and type(meta.__call) == 'function' or false
end

--- Calls a script's callback; an error in it is printed and answers nil.
---@param fn any
---@return any ...
function BridgeVRP.call(fn, ...)
    if not BridgeVRP.isCallable(fn) then return nil end
    local result = table.pack(pcall(fn, ...))
    if not result[1] then
        print(('^1[vRP] callback failed: %s^0'):format(result[2]))
        return nil
    end
    return table.unpack(result, 2, result.n)
end

--- The resource calling a proxy function (`ai-core` for the bridge's own calls).
---@return string
function BridgeVRP.caller()
    return GetInvokingResource() or 'ai-core'
end

---@type table<string, true>
local warned = {}

--- Prints a warning once per key.
---@param key string
---@param text string
function BridgeVRP.warnOnce(key, text)
    if warned[key] then return end
    warned[key] = true
    print(('^3[vRP] %s^0'):format(text))
end

-- Users ---------------------------------------------------------------------------------------------------------------

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

-- UData / SData ---------------------------------------------------------------------------------------------------

local DATATABLE = 'vRP:datatable'

--- A character's value for `key` (`''` when unset); `vRP:datatable` answers the computed data table as JSON.
---@param user_id any
---@param key any
---@return string
function vRP.getUData(user_id, key)
    local id = tonumber(user_id)
    if not id or key == nil then return '' end
    if key == DATATABLE then return json.encode(vRP.getUserDataTable(id) or {}) end
    return BridgeVRP.data.get('c', id, tostring(key))
end

--- Stores a character's value (writes to `vRP:datatable` are ignored: ai-core owns that data).
---@param user_id any
---@param key any
---@param value any
function vRP.setUData(user_id, key, value)
    local id = tonumber(user_id)
    if not id or key == nil or key == DATATABLE then return end
    BridgeVRP.data.set('c', id, tostring(key), value == nil and '' or value)
end

---@param key any
---@return string
function vRP.getSData(key)
    if key == nil then return '' end
    return BridgeVRP.data.get('s', '', tostring(key))
end

---@param key any
---@param value any
function vRP.setSData(key, value)
    if key == nil then return end
    BridgeVRP.data.set('s', '', tostring(key), value == nil and '' or value)
end

-- DB API ------------------------------------------------------------------------------------------------------------

--- Prepared statements per calling resource (vRP keeps one global list; a name another resource prepared is found
--- too). A stopped resource's names go.
---@type table<string, table<string, string>>
local prepared = {}

---@param name any
---@param sql any
function vRP.prepare(name, sql)
    if type(name) ~= 'string' or type(sql) ~= 'string' then return end
    local owner = BridgeVRP.caller()
    prepared[owner] = prepared[owner] or {}
    prepared[owner][name] = sql
end

---@param owner string
---@param name string
---@return string|nil
local function preparedSql(owner, name)
    local own = prepared[owner]
    if own and own[name] then return own[name] end
    for _, list in pairs(prepared) do
        if list[name] then return list[name] end
    end
    return nil
end

--- Runs a prepared statement: mode `query` (default) -> rows, affected; `execute` -> affected; `scalar` -> value.
---@param name any
---@param params any
---@param mode? 'query'|'execute'|'scalar'
---@return any ...
function vRP.query(name, params, mode)
    if mode ~= 'execute' and mode ~= 'scalar' then mode = 'query' end
    local sql = type(name) == 'string' and preparedSql(BridgeVRP.caller(), name)
    if not sql then
        print(('^1[vRP] query %s does not exist (vRP.prepare it first)^0'):format(tostring(name)))
        if mode == 'query' then return {}, 0 end
        return mode == 'execute' and 0 or nil
    end
    return BridgeVRP.query(sql, type(params) == 'table' and params or {}, mode)
end

---@param name any
---@param params any
---@return integer affected
function vRP.execute(name, params)
    return vRP.query(name, params, 'execute')
end

---@param name any
---@param params any
---@return any value
function vRP.scalar(name, params)
    return vRP.query(name, params, 'scalar')
end

--- vRP DB drivers are not needed: ai-core runs every query on its own pool.
---@param name any
function vRP.registerDBDriver(name)
    BridgeVRP.warnOnce('dbdriver', ('DB driver %s ignored: ai-core runs vRP queries itself, the driver resource can be removed'):format(tostring(name)))
end

AddEventHandler('onResourceStop', function(resource)
    prepared[resource] = nil
end)
