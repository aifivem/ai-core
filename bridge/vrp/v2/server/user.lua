-- vRP 2 / 3 on ai-core, the server `User` object: stored extension data, the core data views and the shared method
-- table rebuilt when an extension comes or goes.

local V = BridgeVRP2
local vRP = V.vRP
local core = Bridge.core
local run = V.run
local DATATABLE = V.datatable

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

V.stored = stored
V.saveUser = saveUser
V.loadTable = loadTable
V.cdataView = cdataView
V.coreMixins = coreMixins
V.scriptUserExts = scriptUserExts
V.userMeta = userMeta
V.rebuildUser = rebuildUser
V.constructFor = constructFor
V.userExtension = onExtension
