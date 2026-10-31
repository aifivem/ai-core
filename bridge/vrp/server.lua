-- vRP on ai-core, server side: the "vRP" proxy interface (v1 functions, v2 / v3 `loadScript`), the server "vRP"
-- tunnel clients call, the client tunnel the bridge calls, and vRP 1's player events. Layout and how to add a
-- function: bridge/vrp/CLAUDE.md. v1 `user_id` = ai-core character id (docs/research plan 4.1).

local Proxy = module('vrp', 'lib/Proxy')
local Tunnel = module('vrp', 'lib/Tunnel')
local core = Bridge.core

---@class BridgeVRPServer
---@field proxy table<string, function> the "vRP" proxy interface: every work package adds its functions here
---@field tunnel table<string, function> server functions clients may call on the "vRP" tunnel (rate limited)
---@field client table the "vRP" tunnel to clients: `BridgeVRP.client.notify(source, text)` (`_notify` = no wait)
BridgeVRP = {
    proxy = {},
    tunnel = {},
    client = Tunnel.getInterface('vRP', 'ai-core'),
}

---@type table<integer, integer> character id (v1 user_id) -> source
local byCharId = {}
---@type table<integer, integer> source -> spawns of this character load
local spawns = {}

--- The v1 user_id (character id) of a player with a loaded character.
---@param source any
---@return integer|nil
function BridgeVRP.userId(source)
    local mirror = Bridge.players[tonumber(source) or -1]
    return mirror and mirror.character.id or nil
end

--- The source of a loaded character (v1 user_id).
---@param userId any
---@return integer|nil
function BridgeVRP.sourceOf(userId)
    return byCharId[tonumber(userId) or -1]
end

--- How often the loaded character of a player spawned in this load (0 = not yet, 1 = first spawn).
---@param source any
---@return integer
function BridgeVRP.spawns(source)
    return spawns[tonumber(source) or -1] or 0
end

--- Runs `start(done)` (an ai-core export taking a callback) and returns what `done` got: at once when it answered
--- synchronously (cache hits work outside a thread), else waits (needs a thread, as vRP's own DB calls).
---@param start fun(done: fun(...))
---@return any ...
function BridgeVRP.await(start)
    local result, p
    start(function(...)
        result = table.pack(...)
        if p then p:resolve(result) end
    end)
    if not result then
        p = promise.new()
        Citizen.Await(p)
    end
    return table.unpack(result, 1, result.n)
end

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

-- Ids (v1). The rest of the v1 API is added by bridge/vrp/v1/*.lua (see CLAUDE.md).
local vRP = BridgeVRP.proxy

---@param source any
---@return integer|nil
function vRP.getUserId(source) return BridgeVRP.userId(source) end

---@param user_id any
---@return integer|nil
function vRP.getUserSource(user_id) return BridgeVRP.sourceOf(user_id) end

--- Map of user_id -> source of every loaded character (a copy, as vRP).
---@return table<integer, integer>
function vRP.getUsers()
    local out = {}
    for id, source in pairs(byCharId) do out[id] = source end
    return out
end

Proxy.addInterface('vRP', vRP)

-- Clients reach only `BridgeVRP.tunnel` functions, looked up at call time (packages add theirs later), each
-- behind the bridge's shared rate gate.
---@type table<string, { f: function, call: function }>
local gated = {}
Tunnel.bindInterface('vRP', setmetatable({}, {
    __index = function(_, member)
        local f = BridgeVRP.tunnel[member]
        if type(f) ~= 'function' then return nil end
        local wrapped = gated[member]
        if not wrapped or wrapped.f ~= f then
            wrapped = { f = f, call = function(...)
                if not Bridge.allow(source) then return end
                return f(...)
            end }
            gated[member] = wrapped
        end
        return wrapped.call
    end,
}))

-- vRP 1 player events: join when the character is loaded (vRP fires it on connect; ai-core has the id only then),
-- spawn 2 s after ai-core spawned it (as vRP), leave when it is let go (drop or character switch).
Bridge.on('loaded', function(source)
    local id = BridgeVRP.userId(source)
    if not id then return end
    byCharId[id] = source
    spawns[source] = 0
    TriggerEvent('vRP:playerJoin', id, source, GetPlayerName(tostring(source)) or '', '')
end)

Bridge.on('unloaded', function(source)
    local id = BridgeVRP.userId(source)
    spawns[source] = nil
    if not id then return end
    TriggerEvent('vRP:playerLeave', id, source)
    byCharId[id] = nil
end)

AddEventHandler('ai-core:playerSpawned', function(source, charId)
    if GetInvokingResource() and GetInvokingResource() ~= 'ai-core' then return end
    local count = (spawns[source] or 0) + 1
    spawns[source] = count
    SetTimeout(2000, function()
        if BridgeVRP.userId(source) ~= charId then return end
        TriggerEvent('vRP:playerSpawn', charId, source, count == 1)
    end)
end)
