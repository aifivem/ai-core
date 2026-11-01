-- vRP's key-value data and DB API on ai-core (`BridgeVRP.data`, `BridgeVRP.query`).

local core = Bridge.core

---@param hex string
---@return string
local function fromHex(hex)
    return (hex:gsub('%x%x', function(cc) return string.char(tonumber(cc, 16)) end))
end

---@alias VrpDataKind 'c'|'u'|'s'|'g' c = character (v1 UData, v2 CData), u = account (v2 UData), s = server, g = global

--- vRP's key-value data (`ai_core_vrp_data`, cached in ai-core's JS): values cross as hex, so any bytes survive.
BridgeVRP.data = {}

--- The value of a key, `''` when unset (vRP's answer for a missing key).
---@param kind VrpDataKind
---@param owner any character id, account id, server id or ''
---@param key string
---@return string
function BridgeVRP.data.get(kind, owner, key)
    local hex = BridgeVRP.await(function(done) core:VrpGetData(kind, tostring(owner or ''), tostring(key), done) end)
    return type(hex) == 'string' and fromHex(hex) or ''
end

--- Stores a value (written to the database within a second, and when the character unloads).
---@param kind VrpDataKind
---@param owner any
---@param key string
---@param value any strings as they are, other values through tostring
---@return boolean
function BridgeVRP.data.set(kind, owner, key, value)
    if type(value) ~= 'string' then value = tostring(value) end
    return core:VrpSetData(kind, tostring(owner or ''), tostring(key), tohex(value)) == true
end

--- vRP's DB API on ai-core's pool: `@name` params, several statements split and run on one connection.
---@param sql string
---@param params table|nil
---@param mode 'query'|'execute'|'scalar'
---@return any ... `query`: rows, affected; `execute`: affected; `scalar`: value
function BridgeVRP.query(sql, params, mode)
    local rets = table.pack(BridgeVRP.await(function(done) core:VrpQuery(sql, params or {}, mode, done) end))
    if rets[1] then
        print(('^1[vRP] query failed: %s^0'):format(rets[1]))
        if mode == 'query' then return {}, 0 end
        return mode == 'execute' and 0 or nil
    end
    return table.unpack(rets, 2, rets.n)
end
