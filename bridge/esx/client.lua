-- ESX on ai-core, client side: ESX.PlayerData / GetPlayerData / SetPlayerData / TriggerServerCallback /
-- RegisterClientCallback / SearchInventory / ShowNotification and the player data events, fired locally from the
-- bridge mirror. Lifecycle, vehicle, death and server-sent events: bridge/esx/client_events.lua.

local RESOURCE = GetCurrentResourceName()

---@param account string
---@return string
local function esxAccount(account) return account == 'cash' and 'money' or account end

local esxJob = BridgeShapes.esxJob

--- ESX's default inventory limit in grams (`Config.MaxWeight` 24 kg); an inventory or the server bridge sends the real
--- one with `esx:setMaxWeight`.
local DEFAULT_MAX_WEIGHT = 24000

---@class ESXClientAccount
---@field name string
---@field money number
---@field label string
---@field round boolean
---@field index integer

---@class ESXClientPlayerData
---@field identifier string
---@field accounts ESXClientAccount[]
---@field money number cash
---@field job ESXJob
---@field inventory table[] filled by the inventory (`ESX.SetPlayerData('inventory', ...)` / `esx:setInventory`)
---@field loadout table[] always empty: weapons are inventory items on ai-core
---@field weight number
---@field maxWeight number
---@field group string
---@field name string
---@field firstName string
---@field lastName string
---@field dateofbirth string
---@field sex string
---@field metadata table
---@field variables table
---@field ped integer
---@field coords vector3 read live from the ped (metatable, like ESX)
---@field dead boolean
---@field vehicle integer|false
---@field seat integer|false
---@field weapon integer|false

---@class ESXClient
---@field Math table ESX.Math (bridge/esx/shared.lua)
---@field Table table ESX.Table (bridge/esx/shared.lua)
---@field PlayerData ESXClientPlayerData|table
ESX = { PlayerData = {}, PlayerLoaded = false, Game = {}, UI = {} }

--- Values the server or an inventory set that ai-core's mirror does not hold; kept across a rebuild.
local extra = { group = 'user', maxWeight = DEFAULT_MAX_WEIGHT, inventory = {}, weight = 0 }

---@return ESXClientAccount[]
local function accounts()
    local out = {}
    for name, balance in pairs(BridgeClient.money) do
        out[#out + 1] = { name = esxAccount(name), money = balance, label = name, round = true, index = #out + 1 }
    end
    return out
end

--- ESX keeps `coords` out of PlayerData and answers it from the ped (es_extended's TrackPedCoordsOnce).
---@param data table
local function trackCoords(data)
    data.coords = nil
    setmetatable(data, { __index = function(_, key)
        if key == 'coords' then return GetEntityCoords(data.ped or PlayerPedId()) end
    end })
end

local function rebuild()
    local s = BridgeClient
    if not s.loaded or not s.character then
        ESX.PlayerData, ESX.PlayerLoaded = {}, false
        return
    end
    local c = s.character
    local cache = aiLib.cache
    ESX.PlayerData = {
        identifier = c.citizenid,
        accounts = accounts(),
        money = BridgeClient.money.cash or 0,
        job = esxJob(s.job),
        inventory = extra.inventory,
        loadout = {},
        weight = extra.weight,
        maxWeight = extra.maxWeight,
        group = extra.group,
        name = ('%s %s'):format(c.firstname, c.lastname),
        firstName = c.firstname,
        lastName = c.lastname,
        dateofbirth = c.birthdate,
        sex = c.sex == 'female' and 'f' or 'm',
        metadata = BridgeClient.metadata,
        variables = {},
        ped = cache.ped,
        dead = exports['ai-core']:IsDead() == true,
        vehicle = cache.vehicle,
        seat = cache.seat,
        weapon = cache.weapon,
    }
    trackCoords(ESX.PlayerData)
    ESX.PlayerLoaded = true
end

function ESX.GetPlayerData() return ESX.PlayerData end

--- Config keys read from ESX's weapon list (loaded only when asked for).
local weaponKeys = { Weapons = true, DefaultWeaponTints = true, MK2WeaponTints = true }

---@param key? string
---@return any
function ESX.GetConfig(key)
    local config = {
        Locale = GetConvar('esx:locale', 'en'),
        EnableDebug = false,
        CustomInventory = true,
        EnableDefaultInventory = false,
        Multichar = true,
        Identity = true,
        ValidCharacterSets = {},
    }
    if key and not weaponKeys[key] then return config[key] end
    local weapons = BridgeESXWeapons()
    config.Weapons, config.DefaultWeaponTints, config.MK2WeaponTints = weapons.Weapons, weapons.DefaultWeaponTints, weapons.MK2WeaponTints
    if key then return config[key] end
    return config
end

--- A net event only the server may trigger (ESX's SecureNetEvent).
---@param name string
---@param cb function
function ESX.SecureNetEvent(name, cb)
    RegisterNetEvent(name, function(...)
        if GetInvokingResource() ~= nil and GetInvokingResource() ~= 'ai-core' then return end
        cb(...)
    end)
end

function ESX.IsPlayerLoaded() return ESX.PlayerLoaded end

--- Sets a PlayerData value and tells every ESX import (`esx:setPlayerData (key, value, last)`), as es_extended does:
--- not for `loadout`, and for a plain value only when it changed.
---@param key string
---@param value any
function ESX.SetPlayerData(key, value)
    local current = ESX.PlayerData[key]
    ESX.PlayerData[key] = value
    if key == 'inventory' or key == 'weight' or key == 'maxWeight' or key == 'group' then extra[key] = value end
    if key ~= 'loadout' and (type(value) == 'table' or value ~= current) then
        TriggerEvent('esx:setPlayerData', key, value, current)
    end
end

---@param text string
---@param kind? string
---@param length? integer
function ESX.ShowNotification(text, kind, length)
    BridgeClient.notify(text, kind, length)
end

---@param name string
---@param cb function
function ESX.TriggerServerCallback(name, cb, ...)
    BridgeClient.esxCallback(name, cb, ...)
end

-- Inventory ----------------------------------------------------------------------------------------------------------

--- ESX's SearchInventory over `ESX.PlayerData.inventory` (filled by the inventory). An item the list does not hold is
--- asked from ai-core's inventory layer (`HasItem`), which knows only whether the player has it: count 1 or 0.
---@param items string|string[]
---@param count? boolean
---@return any
function ESX.SearchInventory(items, count)
    local single
    if type(items) == 'string' then
        single, items = items, { items }
    end
    local wanted = {}
    for i = 1, #items do wanted[items[i]] = true end
    local data = {}
    for _, entry in ipairs(ESX.PlayerData.inventory or {}) do
        if wanted[entry.name] then
            wanted[entry.name] = nil
            data[entry.name] = count and entry.count or entry
        end
    end
    for name in pairs(wanted) do
        local has = aiLib.inventory.hasItem(name, 1) == true
        if count then
            data[name] = has and 1 or 0
        elseif has then
            data[name] = { name = name, count = 1, label = name, weight = 0, usable = false, rare = false, canRemove = true }
        end
    end
    if single then return data[single] end
    return data
end

--- Opens ai-core's inventory (whatever inventory runs).
function ESX.ShowInventory() aiLib.inventory.openInventory() end

-- Client callbacks (the server's ESX.TriggerClientCallback) ---------------------------------------------------------

--- The server waits 30 s for an answer (lib `triggerClientCallback`); an ESX callback that never calls `cb` is given up
--- after the same time.
local CALLBACK_TIMEOUT = 30000

---@type table<string, { owner: string, cb: function }>
local clientCallbacks = {}
--- Names already answered through the lib (its net handler stays for the session; a new owner just replaces the entry).
---@type table<string, boolean>
local libCallbacks = {}

--- Runs a registered ESX client callback (`function(cb, ...)`) and waits for its `cb(...)`: the first value goes back.
---@param name string
---@return any
local function answerCallback(name, ...)
    local entry = clientCallbacks[name]
    if not entry then error(('client callback %s does not exist'):format(name)) end
    local answer, done = promise.new(), false
    local function reply(...)
        if done then return end
        done = true
        answer:resolve({ ... })
    end
    SetTimeout(CALLBACK_TIMEOUT, function() reply() end)
    local ok, err = pcall(entry.cb, reply, ...)
    if not ok then error(err) end
    return Citizen.Await(answer)[1]
end

--- Registers a callback the server calls with `ESX.TriggerClientCallback` / `AwaitClientCallback` (ai-lib's client
--- callback wire, `aiLib.onServerCallback`).
---@param eventName string
---@param callback fun(cb: function, ...)
function ESX.RegisterClientCallback(eventName, callback)
    clientCallbacks[eventName] = { owner = GetInvokingResource() or RESOURCE, cb = callback }
    if libCallbacks[eventName] then return end
    libCallbacks[eventName] = true
    aiLib.onServerCallback(eventName, function(...) return answerCallback(eventName, ...) end)
end

---@param eventName string
---@return boolean
function ESX.DoesClientCallbackExist(eventName) return clientCallbacks[eventName] ~= nil end

AddEventHandler('onClientResourceStop', function(resource)
    for name, entry in pairs(clientCallbacks) do
        if entry.owner == resource then clientCallbacks[name] = nil end
    end
end)

-- Shared object and the mirror's events ------------------------------------------------------------------------------

AddEventHandler('esx:getSharedObject', function(cb)
    if BridgeUI.isCallable(cb) then cb(ESX) end
end)
BridgeClient.provideExport('es_extended', 'getSharedObject', function() return ESX end)

BridgeClient.on('loaded', function()
    rebuild()
    TriggerEvent('esx:playerLoaded', ESX.PlayerData, false, {})
end)

BridgeClient.on('unloaded', function()
    TriggerEvent('esx:onPlayerLogout')
    extra.inventory, extra.weight = {}, 0
    rebuild()
end)

BridgeClient.on('money', function(account, balance)
    if not ESX.PlayerLoaded then return end
    ESX.SetPlayerData('accounts', accounts())
    if account == 'cash' then ESX.SetPlayerData('money', balance) end
    TriggerEvent('esx:setAccountMoney', { name = esxAccount(account), money = balance, label = account, round = true })
end)

BridgeClient.on('meta', function()
    if ESX.PlayerLoaded then ESX.SetPlayerData('metadata', BridgeClient.metadata) end
end)

BridgeClient.on('job', function(job, last)
    local next = esxJob(job)
    if ESX.PlayerLoaded then ESX.SetPlayerData('job', next) end
    TriggerEvent('esx:setJob', next, last and esxJob(last) or nil)
end)
