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
local core = Bridge.core
local run = V.run
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

--- `BridgeVRP.ui` (bridge/vrp/ui.lua) or nil with one warning.
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

-- User --------------------------------------------------------------------------------------------------------------

---@type table<table, { u: string|nil, c: string|nil }> user -> last stored msgpack of data / cdata
local stored = setmetatable({}, { __mode = 'k' })

---@param raw any
---@return table
local function plainCopy(raw)
    local out = {}
    for k, v in next, raw do out[k] = v end
    return out
end

--- Writes a user's `data` / `cdata` (the keys extensions own) when they changed since the last write.
---@param user table
local function saveUser(user)
    local last = stored[user]
    if not last then
        last = {}
        stored[user] = last
    end
    local ok, packed = pcall(msgpack.pack, plainCopy(user.data))
    if ok and packed ~= last.u then
        last.u = packed
        BridgeVRP.data.set('u', user.id, DATATABLE, packed)
    end
    if user.cid and user.cdata and not user.loading_character then
        ok, packed = pcall(msgpack.pack, plainCopy(user.cdata))
        if ok and packed ~= last.c then
            last.c = packed
            BridgeVRP.data.set('c', user.cid, DATATABLE, packed)
        end
    end
end

--- A stored table (`''` or bad data = empty).
---@param kind VrpDataKind
---@param owner any
---@return table
---@return string|nil packed what was read
local function loadTable(kind, owner)
    local packed = BridgeVRP.data.get(kind, owner, DATATABLE)
    if packed == '' then return {}, nil end
    local ok, value = pcall(msgpack.unpack, packed)
    return (ok and type(value) == 'table') and value or {}, packed
end

-- `user.cdata` keys vRP's core modules own are views of ai-core's data: reads ask the user methods, wallet / bank
-- writes go to them, other writes are refused; every other key is the extensions' own (stored per character).
local coreRead = {
    wallet = function(user) return user:getWallet() end,
    bank = function(user) return user:getBank() end,
    groups = function(user) return user:getGroups() end,
    inventory = function(user) return user:getInventory() end,
    vitals = function(user) return { food = user:getVital('food'), water = user:getVital('water') } end,
}
local coreWrite = {
    wallet = function(user, value) user:setWallet(value) end,
    bank = function(user, value) user:setBank(value) end,
}

---@param user table
---@param raw table
---@return table
local function cdataView(user, raw)
    for key in pairs(coreRead) do raw[key] = nil end
    return setmetatable(raw, {
        __index = function(_, key)
            local read = coreRead[key]
            if read then return read(user) end
        end,
        __newindex = function(t, key, value)
            local write = coreWrite[key]
            if write then return write(user, value) end
            if coreRead[key] then return end
            rawset(t, key, value)
        end,
    })
end

local UserBase = {}

--- The character is loaded (not loading).
---@return boolean
function UserBase:isReady()
    return self.cid ~= nil and not self.loading_character
end

function UserBase:save()
    saveUser(self)
end

--- ai-core's character screen owns the characters: only the loaded one is listed.
---@return integer[]
function UserBase:getCharacters()
    return self.cid and { self.cid } or {}
end

--- Characters are made on ai-core's character screen.
---@return nil
function UserBase:createCharacter()
    return nil
end

--- The loaded character answers true; another id sends the player to ai-core's character screen (false, 2).
---@param id any
---@return boolean
---@return integer|nil
function UserBase:useCharacter(id)
    if tonumber(id) == self.cid then return true end
    core:SwitchCharacter(self.source)
    return false, 2
end

---@return boolean
function UserBase:deleteCharacter()
    return false
end

---@type { methods: table, construct: fun(user: table)|nil }[] core module mixins, in order
local coreMixins = {}
---@type table[] script extensions with a `User` class, in registration order
local scriptUserExts = {}
local userMethods = {}
local userMeta = { __index = userMethods }

---@param from table
local function addMethods(from)
    for key, value in pairs(from) do
        if type(key) == 'string' and key:sub(1, 2) ~= '__' and type(value) == 'function' then userMethods[key] = value end
    end
end

--- User methods = core mixins, then extensions' `User` methods (later ones win, as vRP's class build), then User's
--- own. Rebuilt when an extension comes or goes, so users already online get the methods too.
local function rebuildUser()
    for key in pairs(userMethods) do userMethods[key] = nil end
    for _, mixin in ipairs(coreMixins) do addMethods(mixin.methods) end
    for _, ext in ipairs(scriptUserExts) do addMethods(ext.User) end
    addMethods(UserBase)
end

---@param ext table
---@param user table
local function constructFor(ext, user)
    local construct = rawget(ext.User, '__construct')
    if type(construct) == 'function' then run(V.ownerOf(ext), construct, user) end
end

--- A script extension came or went: its User methods are added / removed, its User constructor runs for every
--- user already online (set after the core extensions, which are mixins of their own).
---@param ext table
---@param added boolean
local function onExtension(ext, added)
    if type(ext.User) ~= 'table' then return end
    if added then
        scriptUserExts[#scriptUserExts + 1] = ext
        rebuildUser()
        for _, user in pairs(vRP.users) do constructFor(ext, user) end
        return
    end
    for i = #scriptUserExts, 1, -1 do
        if scriptUserExts[i] == ext then table.remove(scriptUserExts, i) end
    end
    rebuildUser()
end

-- Core extensions ---------------------------------------------------------------------------------------------------

--- A core module: a plain extension object (`remote` = the vRP client tunnel, whose functions carry vRP 2's names) and
--- its User methods.
---@param name string
---@param ext table
---@param events table|nil
---@param user table|nil User methods (`__construct(user)` runs for every user)
---@return table
local function coreExtension(name, ext, events, user)
    ext.remote = BridgeVRP.client
    ext.log = function(_, msg, level) vRP:log(msg, name, level) end
    ext.error = function(_, msg) vRP:error(msg, name) end
    if user then
        ext.User = user
        coreMixins[#coreMixins + 1] = { methods = user, construct = rawget(user, '__construct') }
    end
    V.addExtension(name, ext, events, nil)
    return ext
end

-- Base: ids to the client (`vRP.EXT.Base.id` / `cid` there).
coreExtension('Base', {}, {
    characterLoad = function(self, user) self.remote._setCharacterId(user.source, user.cid) end,
    playerSpawn = function(self, user, first)
        if first then
            self.remote._setUserId(user.source, user.id)
            self.remote._setCharacterId(user.source, user.cid)
        end
    end,
})

-- Money: wallet = account `cash`, bank = account `bank` (vRP 1 money functions).
local MoneyUser = {}

---@return integer
function MoneyUser:getWallet() return v1('getMoney', 0, self.cid) or 0 end
---@return integer
function MoneyUser:getBank() return v1('getBankMoney', 0, self.cid) or 0 end
---@param amount any
function MoneyUser:setWallet(amount) return v1('setMoney', false, self.cid, amountOf(amount)) == true end
---@param amount any
function MoneyUser:setBank(amount) return v1('setBankMoney', false, self.cid, amountOf(amount)) == true end
---@param amount any
function MoneyUser:giveWallet(amount) return v1('giveMoney', false, self.cid, amountOf(math.abs(tonumber(amount) or 0))) == true end
---@param amount any
function MoneyUser:giveBank(amount) return v1('giveBankMoney', false, self.cid, amountOf(math.abs(tonumber(amount) or 0))) == true end

--- Pays from the wallet; `dry` only checks.
---@param amount any
---@param dry? boolean
---@return boolean
function MoneyUser:tryPayment(amount, dry)
    amount = amountOf(amount)
    if not amount then return false end
    if dry then return self:getWallet() >= amount end
    return v1('tryPayment', false, self.cid, amount) == true
end

--- Bank to wallet; `dry` only checks.
---@param amount any
---@param dry? boolean
---@return boolean
function MoneyUser:tryWithdraw(amount, dry)
    amount = amountOf(amount)
    if not amount then return false end
    if dry then return self:getBank() >= amount end
    return v1('tryWithdraw', false, self.cid, amount) == true
end

--- Wallet to bank; `dry` only checks.
---@param amount any
---@param dry? boolean
---@return boolean
function MoneyUser:tryDeposit(amount, dry)
    amount = amountOf(amount)
    if not amount then return false end
    if dry then return self:getWallet() >= amount end
    return v1('tryDeposit', false, self.cid, amount) == true
end

--- Wallet first, the rest from the bank; `dry` only checks.
---@param amount any
---@param dry? boolean
---@return boolean
function MoneyUser:tryFullPayment(amount, dry)
    amount = amountOf(amount)
    if not amount then return false end
    if dry then return self:getWallet() + self:getBank() >= amount end
    return v1('tryFullPayment', false, self.cid, amount) == true
end

--- vRP 3: pays from the bank only (amount above 0); `dry` only checks.
---@param amount any
---@param dry? boolean
---@return boolean
function MoneyUser:tryCardPayment(amount, dry)
    amount = amountOf(amount)
    if not amount or amount <= 0 then return false end
    if dry then return self:getBank() >= amount end
    return v1('tryBankPayment', false, self.cid, amount) == true
end

local Money = coreExtension('Money', {
    cfg = { open_wallet = 0, open_bank = 0, money_display = false, money_type = 'USD', currency_symbols = { USD = '$' } },
}, nil, MoneyUser)

--- vRP 3: the wallet amount as vRP's money display shows it.
---@param amount any
---@return string
function Money:formatWallet(amount)
    local symbol = self.cfg.currency_symbols[self.cfg.money_type] or ''
    return ('<span class="symbol">%s</span>%s'):format(symbol, tostring(formatNumber(tonumber(amount) or 0)))
end

-- Group: groups and permissions from the panel's vRP mapping (vRP 1 group functions); `!name` permission functions
-- registered by vRP 2 extensions get the user.
---@type table<string, { fn: function, owner: VrpOwner|nil }>
local permissionFunctions = {}

local GroupUser = {}

---@param name any
---@return boolean
function GroupUser:hasGroup(name) return v1('hasGroup', false, self.cid, name) == true end
---@return table<string, true>
function GroupUser:getGroups() return v1('getUserGroups', {}, self.cid) or {} end
---@param name any
function GroupUser:addGroup(name) v1('addUserGroup', nil, self.cid, name) end
---@param name any
function GroupUser:removeGroup(name) v1('removeUserGroup', nil, self.cid, name) end

--- `job` = ai-core's current job, `gang` = the active gang; nil when none.
---@param gtype any
---@return string|nil
function GroupUser:getGroupByType(gtype)
    local name = v1('getUserGroupByType', '', self.cid, gtype)
    return name ~= '' and name or nil
end

---@param perm any
---@return boolean
function GroupUser:hasPermission(perm)
    if type(perm) ~= 'string' then return false end
    if perm:sub(1, 1) == '!' then
        local params = splitString(perm:sub(2), '.')
        if params[1] == 'not' then return not self:hasPermission('!' .. table.concat(params, '.', 2)) end
        local entry = permissionFunctions[params[1] or '']
        if entry then
            local rets = table.pack(run(entry.owner, entry.fn, self, params))
            return rets[1] and rets[2] and true or false
        end
    end
    return v1('hasPermission', false, self.cid, perm) == true
end

---@param perms any
---@return boolean
function GroupUser:hasPermissions(perms)
    if type(perms) ~= 'table' then return false end
    for _, perm in pairs(perms) do
        if not self:hasPermission(perm) then return false end
    end
    return true
end

local Group = coreExtension('Group', { cfg = { groups = {}, selectors = {} }, func_perms = {} }, nil, GroupUser)

---@param ids any
---@return table[]
local function usersOf(ids)
    local out = {}
    for _, id in ipairs(type(ids) == 'table' and ids or {}) do
        local user = vRP.users_by_cid[id]
        if user and user:isReady() then out[#out + 1] = user end
    end
    return out
end

---@param name any
---@return table[]
function Group:getUsersByGroup(name) return usersOf(v1('getUsersByGroup', {}, name)) end

---@param perm any
---@return table[]
function Group:getUsersByPermission(perm)
    if type(perm) == 'string' and perm:sub(1, 1) == '!' then
        local out = {}
        for _, user in pairs(vRP.users) do
            if user:isReady() and user:hasPermission(perm) then out[#out + 1] = user end
        end
        return out
    end
    return usersOf(v1('getUsersByPermission', {}, perm))
end

---@param name any
---@return string|nil
function Group:getGroupTitle(name)
    local title = v1('getGroupTitle', nil, name)
    return title ~= '' and title or nil
end

--- `callback(user, params)` answers `!name.<params>`; it goes when its script stops.
---@param name any
---@param callback any
function Group:registerPermissionFunction(name, callback)
    if type(name) ~= 'string' or type(callback) ~= 'function' then return end
    local entry = { fn = callback, owner = V.owner() }
    permissionFunctions[name] = entry
    self.func_perms[name] = callback
    V.track(function()
        if permissionFunctions[name] == entry then
            permissionFunctions[name] = nil
            self.func_perms[name] = nil
        end
    end)
end

-- Inventory: the active inventory through the vRP 1 item functions; items vRP 2 extensions define.
---@type table<string, { name: any, description: any, menu_builder: any, weight: any, owner: VrpOwner|nil }>
local items = {}
local ITEM_MENU = 'vRP:item'

local InventoryUser = {}

--- fullid -> amount.
---@return table<string, integer>
function InventoryUser:getInventory()
    local out = {}
    for id, entry in pairs(v1('getInventory', nil, self.cid) or {}) do
        out[id] = type(entry) == 'table' and entry.amount or entry
    end
    return out
end

---@param fullid any
---@return integer
function InventoryUser:getItemAmount(fullid) return v1('getInventoryItemAmount', 0, self.cid, fullid) or 0 end
---@return number
function InventoryUser:getInventoryWeight() return v1('getInventoryWeight', 0, self.cid) or 0 end
---@return number
function InventoryUser:getInventoryMaxWeight() return v1('getInventoryMaxWeight', 0, self.cid) or 0 end
function InventoryUser:clearInventory() v1('clearInventory', nil, self.cid) end

--- Gives `amount` of an item when it fits the weight limit; `dry` only checks.
---@param fullid any
---@param amount any
---@param dry? boolean
---@return boolean
function InventoryUser:tryGiveItem(fullid, amount, dry)
    amount = amountOf(amount)
    if not amount or amount <= 0 or type(fullid) ~= 'string' then return false end
    local item = vRP.EXT.Inventory:computeItem(fullid)
    if not item then return false end
    if self:getInventoryWeight() + item.weight * amount > self:getInventoryMaxWeight() then return false end
    if dry then return true end
    return v1('giveInventoryItem', false, self.cid, fullid, amount) == true
end

--- Takes `amount` of an item when the character holds it; `dry` only checks.
---@param fullid any
---@param amount any
---@param dry? boolean
---@return boolean
function InventoryUser:tryTakeItem(fullid, amount, dry)
    amount = amountOf(amount)
    if not amount or amount <= 0 or type(fullid) ~= 'string' then return false end
    if dry then return self:getItemAmount(fullid) >= amount end
    return v1('tryGetInventoryItem', false, self.cid, fullid, amount) == true
end

--- A stash of the active inventory (the move callbacks are not fired; `cb_close` is passed on).
---@param id any
---@param max_weight any
---@param cb_close any
function InventoryUser:openChest(id, max_weight, cb_close)
    v1('openChest', nil, self.source, id, max_weight, cb_close)
end

local Inventory = coreExtension('Inventory', { cfg = {}, items = items, computed_items = {} }, nil, InventoryUser)

---@param value any
---@param args string[]
---@return any
local function computeValue(value, args)
    if type(value) == 'function' then return value(args) end
    return value
end

--- Defines an item for vRP 2 scripts (name, description and weight a value or `fn(args)`); `menu_builder(args, menu)`
--- fills the menu that opens when the item is used (the inventory item from the panel mapping must exist).
---@param id any
---@param name any
---@param description any
---@param menu_builder any
---@param weight any
function Inventory:defineItem(id, name, description, menu_builder, weight)
    if type(id) ~= 'string' or id == '' then return end
    local entry = { name = name, description = description, menu_builder = menu_builder, weight = weight, owner = V.owner() }
    items[id] = entry
    self.computed_items = {}
    V.track(function()
        if items[id] == entry then items[id] = nil end
        self.computed_items = {}
    end)
    local item = type(menu_builder) == 'function' and BridgeVRP.itemOf and BridgeVRP.itemOf(id)
    if not item then return end
    core:RegisterUsableItem(item, function(source)
        local user = vRP.users_by_source[tonumber(source) or -1]
        if user and items[id] == entry and V.alive(entry.owner) then user:openMenu(ITEM_MENU, { fullid = id }) end
        return false -- the menu's options take the item themselves (vRP's way)
    end)
end

---@param fullid any
---@return string[]
function Inventory:parseItem(fullid)
    return splitString(tostring(fullid or ''), '|')
end

--- `{ name, description, weight, menu_builder, args }` of an item (defined here, else the active inventory's).
---@param fullid any
---@return table|nil
function Inventory:computeItem(fullid)
    if type(fullid) ~= 'string' then return nil end
    local cached = self.computed_items[fullid]
    if cached then return cached end
    local args = self:parseItem(fullid)
    local own = items[args[1] or '']
    if own then
        local ok, name, description, weight = pcall(function()
            return computeValue(own.name, args), computeValue(own.description, args), computeValue(own.weight, args)
        end)
        if not ok then return nil end
        cached = {
            name = type(name) == 'string' and name or fullid,
            description = type(description) == 'string' and description or '',
            weight = tonumber(weight) or 0,
            menu_builder = own.menu_builder,
            args = args,
        }
        self.computed_items[fullid] = cached
        return cached
    end
    local name, description, weight = v1('getItemDefinition', nil, fullid)
    if not name then return nil end
    return { name = name, description = description or '', weight = tonumber(weight) or 0, args = args }
end

---@param list any fullid -> amount
---@return number
function Inventory:computeItemsWeight(list)
    local weight = 0
    for fullid, amount in pairs(type(list) == 'table' and list or {}) do
        local item = self:computeItem(fullid)
        weight = weight + (item and item.weight or 0) * (tonumber(amount) or 0)
    end
    return weight
end

-- Identity: the character (`registration` = citizenid, `phone` from ai-core's phone layer); `name` and vRP 3
-- `lastname` both hold the last name.
---@param cid integer
---@param identity any
---@return table|nil
local function identityOf(cid, identity)
    if type(identity) ~= 'table' then return nil end
    local out = {}
    for k, v in pairs(identity) do out[k] = v end
    out.character_id = cid
    out.lastname = out.lastname or out.name
    out.name = out.name or out.lastname
    return out
end

local Identity = coreExtension('Identity', { cfg = {} })

--- A character's identity, loaded or not (a stored one waits: call in a thread).
---@param cid any
---@return table|nil
function Identity:getIdentity(cid)
    cid = tonumber(cid)
    if not cid then return nil end
    local user = vRP.users_by_cid[cid]
    if user and user.identity then return user.identity end
    return identityOf(cid, v1('getUserIdentity', nil, cid))
end

---@param registration any
---@return integer|nil character id (loaded characters)
function Identity:getByRegistration(registration) return v1('getUserByRegistration', nil, registration) end

---@param phone any
---@return integer|nil character id (loaded characters)
function Identity:getByPhone(phone) return v1('getUserByPhone', nil, phone) end

-- Survival: vitals 0-1 (1 = full); `food` / `water` are ai-hud's hunger / thirst (vRP 1 functions, 0-100 with
-- 100 = starving), vitals other extensions register live in the character's data.
local SurvivalUser = {}
local needs = { food = { 'getHunger', 'setHunger' }, water = { 'getThirst', 'setThirst' } }

---@param name any
---@return number|nil
function SurvivalUser:getVital(name)
    local need = needs[name]
    if need then
        local value = tonumber(v1(need[1], nil, self.cid))
        return value and math.max(0, math.min(1, 1 - value / 100)) or nil
    end
    local own = self.cdata and rawget(self.cdata, 'vitals_extra')
    return type(own) == 'table' and own[name] or nil
end

---@param name any
---@param value any
function SurvivalUser:setVital(name, value)
    local Survival = vRP.EXT.Survival
    value = tonumber(value)
    if not value or not Survival.vitals[name] or not self.cdata then return end
    local overflow
    if value < 0 then
        overflow, value = value, 0
    elseif value > 1 then
        overflow, value = value - 1, 1
    end
    local need = needs[name]
    if need then
        v1(need[2], nil, self.cid, (1 - value) * 100)
    else
        local own = rawget(self.cdata, 'vitals_extra') or {}
        local previous = own[name]
        own[name] = value
        rawset(self.cdata, 'vitals_extra', own)
        if previous ~= value then vRP:triggerEvent('playerVitalChange', self, name) end
    end
    if overflow then vRP:triggerEvent('playerVitalOverflow', self, name, overflow) end
end

---@param name any
---@param value any
function SurvivalUser:varyVital(name, value)
    local current = self:getVital(name)
    if current and tonumber(value) then self:setVital(name, current + value) end
end

local Survival = coreExtension('Survival', { cfg = {}, vitals = { water = { 1 }, food = { 1 } } }, nil, SurvivalUser)

---@param name any
---@param default_value any
function Survival:registerVital(name, default_value)
    if type(name) ~= 'string' or self.vitals[name] then return end
    self.vitals[name] = { tonumber(default_value) or 1 }
    V.track(function() self.vitals[name] = nil end)
end

-- GUI: menus, prompt and request through bridge/vrp/ui.lua.
local GUIUser = {}

---@return table|nil
function GUIUser:getMenu()
    local ui = gui()
    return ui and ui.v2.getMenu(self)
end

---@param name any
---@param data any
---@return table|nil
function GUIUser:openMenu(name, data)
    local ui = gui()
    return ui and ui.v2.openMenu(self, name, data)
end

---@param menu? table
function GUIUser:closeMenu(menu)
    local ui = gui()
    if ui then ui.v2.closeMenu(self, menu) end
end

function GUIUser:actualizeMenu()
    local ui = gui()
    if ui then ui.v2.actualizeMenu(self) end
end

function GUIUser:closeMenus()
    local ui = gui()
    if ui then ui.v2.closeMenus(self) end
end

--- The text the player typed (`''` on cancel); waits.
---@param title any
---@param default_text any
---@return string
function GUIUser:prompt(title, default_text)
    local ui = gui()
    return ui and ui.prompt(self.source, title, default_text) or ''
end

--- True when the player said yes within `time` seconds; waits.
---@param text any
---@param time any
---@return boolean
function GUIUser:request(text, time)
    local ui = gui()
    return ui and ui.request(self.source, text, time) == true or false
end

local GUI = coreExtension('GUI', { cfg = module('vrp', 'cfg/gui') }, nil, GUIUser)

--- `builder(menu)` fills menus named `name`; it goes when its script stops.
---@param name any
---@param builder any
function GUI:registerMenuBuilder(name, builder)
    local ui = gui()
    if ui then ui.v2.registerMenuBuilder(name, builder, ownerResource()) end
end

---@param menu table
function GUI:buildMenu(menu)
    local ui = gui()
    if ui then ui.v2.buildMenu(menu) end
end

if BridgeVRP.ui and BridgeVRP.ui.v2 then
    GUI.menu_builders = BridgeVRP.ui.v2.builders
    BridgeVRP.ui.v2.user = function(source) return vRP.users_by_source[source] end
    -- The menu of an item defined by a vRP 2 extension.
    BridgeVRP.ui.v2.registerMenuBuilder(ITEM_MENU, function(menu)
        local item = Inventory:computeItem(menu.data.fullid)
        if not item then return end
        menu.title = item.name
        if type(item.menu_builder) == 'function' then
            local own = items[item.args[1]]
            run(own and own.owner, item.menu_builder, item.args, menu)
        end
    end, 'ai-core')
end

-- Map: player areas through vRP 1 `setArea` (the client reports, the server checks the ped position).
local MapUser = {}

function MapUser:__construct()
    self.map_areas = {}
end

--- `cb_enter(user, name)` / `cb_leave(user, name)` when the player enters / leaves the area.
---@param name any
---@param x any
---@param y any
---@param z any
---@param radius any
---@param height any
---@param cb_enter any
---@param cb_leave any
function MapUser:setArea(name, x, y, z, radius, height, cb_enter, cb_leave)
    if type(name) ~= 'string' then return end
    local owner = V.owner()
    local area = { enter = cb_enter, leave = cb_leave, inside = false }
    self.map_areas[name] = area
    local function relay(fn, inside)
        return function()
            if self.map_areas[name] ~= area then return end
            area.inside = inside
            if type(fn) == 'function' then run(owner, fn, self, name) end
        end
    end
    v1('setArea', nil, self.source, name, x, y, z, radius, height, relay(cb_enter, true), relay(cb_leave, false))
end

---@param name any
function MapUser:removeArea(name)
    if type(name) ~= 'string' or not self.map_areas[name] then return end
    v1('removeArea', nil, self.source, name)
    self.map_areas[name] = nil
end

---@param name any
---@return boolean|nil
function MapUser:inArea(name)
    local area = self.map_areas[name]
    return area and area.inside or nil
end

coreExtension('Map', { cfg = { entities = {} } }, nil, MapUser)

-- Mission: steps the player walks through (a GPS route to each step, the step text as a notification, `onenter` /
-- `onleave` of the step's area).
local MissionUser = {}

--- `mission = { name, steps = { { text, position = { x, y, z }, radius?, height?, onenter?, onleave? } } }`.
---@param mission any
function MissionUser:startMission(mission)
    self:stopMission()
    if type(mission) ~= 'table' or type(mission.steps) ~= 'table' or #mission.steps == 0 then return end
    self.mission_step = 0
    self.mission = mission
    vRP:triggerEvent('playerMissionStart', self)
    self:nextMissionStep()
end

function MissionUser:nextMissionStep()
    local mission = self.mission
    if not mission then return end
    self.mission_step = self.mission_step + 1
    if self.mission_step > #mission.steps then return self:stopMission() end
    local step = mission.steps[self.mission_step]
    local position = type(step.position) == 'table' and step.position or {}
    local x, y, z = tonumber(position[1]), tonumber(position[2]), tonumber(position[3])
    vRP:triggerEvent('playerMissionStep', self)
    if not (x and y and z) then return end
    local text = aiLib.stripGameText(('%s (%d/%d): %s'):format(tostring(mission.name or ''), self.mission_step,
        #mission.steps, tostring(step.text or '')))
    Bridge.notify(self.source, text, 'info', 10000)
    BridgeVRP.client._setGPS(self.source, x, y)
    self:setArea('vRP:mission', x, y, z, step.radius or 1, step.height or 1.5, step.onenter, step.onleave)
end

function MissionUser:stopMission()
    if not self.mission then return end
    self:removeArea('vRP:mission')
    vRP:triggerEvent('playerMissionStop', self)
    self.mission_step = nil
    self.mission = nil
end

---@return boolean
function MissionUser:hasMission()
    return self.mission ~= nil
end

coreExtension('Mission', { cfg = {} }, {
    characterUnload = function(_, user) user:stopMission() end,
}, MissionUser)

-- PlayerState: the client functions (`remote.getWeapons` / `giveWeapons` go through the inventory, as vRP 1's).
coreExtension('PlayerState', { cfg = {} })

rebuildUser()
V.onExtension = onExtension

-- Users and lifecycle -------------------------------------------------------------------------------------------------

---@param source integer
---@param id integer
---@return table
local function newUser(source, id)
    local user = setmetatable({
        source = source, id = id, name = vRP.getPlayerName(source), endpoint = '0.0.0.0', spawns = 0,
        data = {}, loading_character = false,
    }, userMeta)
    for _, mixin in ipairs(coreMixins) do
        if mixin.construct then mixin.construct(user) end
    end
    for _, ext in ipairs(scriptUserExts) do constructFor(ext, user) end
    vRP.users[id] = user
    vRP.users_by_source[source] = user
    local data, packed = loadTable('u', id)
    user.data = data
    stored[user] = { u = packed }
    return user
end

--- characterUnload (waits for the listeners), then the character's data is written.
---@param user table
local function unloadCharacter(user)
    if not user.cid then return end
    vRP:triggerEventSync('characterUnload', user)
    saveUser(user)
    vRP.users_by_cid[user.cid] = nil
    user.cid = nil
end

Bridge.on('loaded', function(source)
    local cid = BridgeVRP.userId(source)
    if not cid then return end
    CreateThread(function()
        local user = vRP.users_by_source[source]
        local joined = false
        if not user then
            local id = tonumber(core:GetUserId(source))
            if not id then return end
            user = newUser(source, id)
            joined = true
        end
        if user.cid == cid then return end
        unloadCharacter(user)
        if BridgeVRP.userId(source) ~= cid then return end
        user.cid = cid
        user.loading_character = true
        vRP.users_by_cid[cid] = user
        local raw, packed = loadTable('c', cid)
        user.cdata = cdataView(user, raw)
        stored[user].c = packed
        user.data.current_character = cid
        user.identity = identityOf(cid, v1('getUserIdentity', nil, cid))
        vRP:triggerEventSync('characterLoad', user)
        user.loading_character = false
        if joined then vRP:triggerEvent('playerJoin', user) end
    end)
end)

Bridge.on('unloaded', function(source)
    local user = vRP.users_by_source[source]
    if user then unloadCharacter(user) end
end)

AddEventHandler('playerDropped', function(reason)
    local source = tonumber(source) --[[@as integer]]
    local user = vRP.users_by_source[source]
    if not user then return end
    unloadCharacter(user)
    vRP:triggerEventSync('playerLeave', user, reason)
    saveUser(user)
    vRP.users[user.id] = nil
    vRP.users_by_source[source] = nil
end)

-- `playerSpawn(user, first_spawn)` 2 s after ai-core spawned the character (as vRP); first = first of this connection.
AddEventHandler('ai-core:playerSpawned', function(source, charId)
    if GetInvokingResource() and GetInvokingResource() ~= 'ai-core' then return end
    local user = vRP.users_by_source[source]
    if not user then return end
    user.spawns = user.spawns + 1
    local first = user.spawns == 1
    SetTimeout(2000, function()
        if vRP.users_by_source[source] == user and user.cid == charId then vRP:triggerEvent('playerSpawn', user, first) end
    end)
end)

AddEventHandler('ai-core:playerDied', function(source)
    if GetInvokingResource() and GetInvokingResource() ~= 'ai-core' then return end
    local user = vRP.users_by_source[source]
    if user and user.cid then vRP:triggerEvent('playerDeath', user) end
end)

Bridge.on('money', function(source, account)
    local user = vRP.users_by_source[source]
    if user and user.cid and (account == 'cash' or account == 'bank') then vRP:triggerEvent('playerMoneyUpdate', user) end
end)

local vitalOf = { hunger = 'food', thirst = 'water' }
Bridge.on('meta', function(source, key)
    local vital = vitalOf[key]
    local user = vital and vRP.users_by_source[source]
    if user and user.cid then vRP:triggerEvent('playerVitalChange', user, vital) end
end)

---@param event string
---@param user_id any
---@param group any
---@param gtype any
local function groupEvent(event, user_id, group, gtype)
    if GetInvokingResource() and GetInvokingResource() ~= 'ai-core' then return end
    local user = vRP.users_by_cid[tonumber(user_id) or -1]
    if user then vRP:triggerEvent(event, user, group, gtype) end
end
AddEventHandler('vRP:playerJoinGroup', function(...) groupEvent('playerJoinGroup', ...) end)
AddEventHandler('vRP:playerLeaveGroup', function(...) groupEvent('playerLeaveGroup', ...) end)

--- `save` event, then every user's data (vRP's `save_interval`).
function vRP:save()
    self:triggerEvent('save')
    for _, user in pairs(self.users) do saveUser(user) end
end

aiLib.every((tonumber(vRP.cfg.save_interval) or 60) * 1000, function() vRP:save() end)

AddEventHandler('onResourceStop', function(resource)
    if resource ~= GetCurrentResourceName() then return end
    for _, user in pairs(vRP.users) do saveUser(user) end
end)

-- loadScript ---------------------------------------------------------------------------------------------------------

--- vRP 2 / 3 `vRP.loadScript(resource, path)`: runs `<resource>/<path>.lua` in the vRP context (bridge/vrp/v2/shared.lua).
---@param resource any
---@param path any
function BridgeVRP.proxy.loadScript(resource, path)
    V.loadScript(resource, path, GetInvokingResource())
end
