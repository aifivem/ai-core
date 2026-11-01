-- vRP 2 / 3 on ai-core, server side: `vRP.loadScript` (the "vRP" proxy), the server `vRP` object extensions see
-- (users, data, DB, events), the `User` object with the core modules' methods, and the core extensions scripts call
-- (`vRP.EXT.Base`, `GUI`, `Group`, `Money`, `Inventory`, `Identity`, `Survival`, `PlayerState`, `Map`, `Mission`).
-- Every user method answers through the vRP 1 functions on `BridgeVRP.proxy` (v1 `user_id` = `user.cid`), menus
-- through `BridgeVRP.ui`, so the vRP 2 layer holds no game logic of its own. Events come from ai-core's lifecycle.
-- v2 `user.id` = ai-core account id, `user.cid` = character id. Folder note: bridge/vrp/CLAUDE.md.
-- vRP 2 (https://github.com/vRP-framework/vRP `vrp/vRP.lua`, `vrp/User.lua`, `vrp/modules/*.lua`) and vRP 3
-- (https://github.com/vRP-framework/vRP3-Dev: `playerLeave` reason, `tryCardPayment`, `formatWallet`, identity
-- `lastname`); MIT, Copyright (c) 2017 ImagicTheCat.

local V = BridgeVRP2
local vRP = V.vRP
local Luang = module('vrp', 'lib/Luang')

vRP.cfg = module('vrp', 'cfg/base')
vRP.log_level = vRP.cfg.log_level or 0
vRP.luang = Luang()
vRP.luang:loadLocale(vRP.cfg.lang, module('vrp', 'cfg/lang/' .. vRP.cfg.lang) or {})
vRP.lang = vRP.luang.lang[vRP.cfg.lang]
---@type table<integer, table> account id -> user
vRP.users = {}
---@type table<integer, table> source -> user
vRP.users_by_source = {}
---@type table<integer, table> character id -> user
vRP.users_by_cid = {}
vRP.DBDriver = class('vRP.DBDriver')

local DATATABLE = 'vRP:datatable'

--- A vRP 1 function of the bridge (looked up at call time); a missing one warns once and answers `default`.
---@param name string
---@param default any
---@param ... any
---@return any ...
local function v1(name, default, ...)
    local f = BridgeVRP.proxy[name]
    if type(f) ~= 'function' then
        BridgeVRP.warnOnce('v2:' .. name, ('vRP 2 needs the vRP 1 function %s, which is not answered'):format(name))
        return default
    end
    return f(...)
end

--- `BridgeVRP.ui` (bridge/vrp/server/gui/) or nil with one warning.
---@return BridgeVRPUi|nil
local function gui()
    if BridgeVRP.ui and BridgeVRP.ui.v2 then return BridgeVRP.ui end
    BridgeVRP.warnOnce('v2:ui', 'vRP 2 menus, prompts and requests need bridge/vrp/ui.lua')
    return nil
end

--- A whole amount of 0 or more (vRP 3 refuses other values), else nil.
---@param value any
---@return integer|nil
local function amountOf(value)
    local n = tonumber(value)
    if not n or n ~= n or n < 0 or n == math.huge then return nil end
    return math.floor(n)
end

--- The resource the running extension code belongs to (owner of menus, builders and usable items it registers).
---@return string
local function ownerResource()
    local owner = V.owner()
    return owner and owner.resource or 'ai-core'
end

-- vRP object --------------------------------------------------------------------------------------------------------

---@param player any
---@return string
function vRP.getPlayerName(player)
    return GetPlayerName(tostring(player) --[[@as any]]) or 'unknown'
end

--- Player addresses are not handed out.
---@return string
function vRP.getPlayerEndpoint()
    return '0.0.0.0'
end

---@type table<string, string> query name -> SQL (vRP 2 keeps one list for every extension)
local prepared = {}

--- `vRP:prepare(name, sql)` with `@name` params; a stopped script's names go.
---@param name any
---@param sql any
function vRP:prepare(name, sql)
    if type(name) ~= 'string' or type(sql) ~= 'string' then return end
    prepared[name] = sql
    V.track(function()
        if prepared[name] == sql then prepared[name] = nil end
    end)
end

--- `vRP:query(name, params, mode)`: `query` (default) -> rows, affected; `execute` -> affected; `scalar` -> value.
---@param name any
---@param params any
---@param mode? 'query'|'execute'|'scalar'
---@return any ...
function vRP:query(name, params, mode)
    if mode ~= 'execute' and mode ~= 'scalar' then mode = 'query' end
    local sql = type(name) == 'string' and prepared[name]
    if not sql then return self:error(("query %s doesn't exist."):format(tostring(name))) end
    return BridgeVRP.query(sql, type(params) == 'table' and params or {}, mode)
end

---@param name any
---@param params any
---@return integer
function vRP:execute(name, params) return self:query(name, params, 'execute') end

---@param name any
---@param params any
---@return any
function vRP:scalar(name, params) return self:query(name, params, 'scalar') end

--- vRP DB drivers are not needed: ai-core runs every query on its own pool.
function vRP:registerDBDriver()
    BridgeVRP.warnOnce('dbdriver2', 'vRP 2 DB driver ignored: ai-core runs vRP queries itself, the driver resource can be removed')
end

-- vRP 2 data: UData per account, CData per character, SData per server id ('' when nil, shared with vRP 1), GData.
---@param user_id any
---@param key any
---@param value any
function vRP:setUData(user_id, key, value) BridgeVRP.data.set('u', user_id, tostring(key), value or '') end
---@param user_id any
---@param key any
---@return string
function vRP:getUData(user_id, key) return BridgeVRP.data.get('u', user_id, tostring(key)) end
---@param cid any
---@param key any
---@param value any
function vRP:setCData(cid, key, value) BridgeVRP.data.set('c', cid, tostring(key), value or '') end
---@param cid any
---@param key any
---@return string
function vRP:getCData(cid, key) return BridgeVRP.data.get('c', cid, tostring(key)) end
---@param key any
---@param value any
---@param id? any
function vRP:setSData(key, value, id) BridgeVRP.data.set('s', id or '', tostring(key), value or '') end
---@param key any
---@param id? any
---@return string
function vRP:getSData(key, id) return BridgeVRP.data.get('s', id or '', tostring(key)) end
---@param key any
---@param value any
function vRP:setGData(key, value) BridgeVRP.data.set('g', '', tostring(key), value or '') end
---@param key any
---@return string
function vRP:getGData(key) return BridgeVRP.data.get('g', '', tostring(key)) end

---@param user table
---@param reason? string
function vRP:kick(user, reason)
    if type(user) == 'table' and user.source then DropPlayer(tostring(user.source), reason or '') end
end

BridgeVRP2.v1 = v1
BridgeVRP2.gui = gui
BridgeVRP2.amountOf = amountOf
BridgeVRP2.ownerResource = ownerResource
BridgeVRP2.datatable = DATATABLE
