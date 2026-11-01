-- vRP 1 server API on ai-core, UData / SData and vRP's DB API (`prepare` / `query` / `execute` / `scalar`).

local vRP = BridgeVRP.proxy

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
