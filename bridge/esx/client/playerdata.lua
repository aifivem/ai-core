-- ESX on ai-core, client side: ESX.PlayerData from the bridge mirror (rebuilt on load, kept current from its changes),
-- GetPlayerData / SetPlayerData / IsPlayerLoaded / GetAccount and the player data events.

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
---@field inventory table[] filled by the inventory (`ESX.SetPlayerData('inventory', ...)` / `esx:setInventory`); rows `SearchInventory` read are kept current
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

---@param account string
---@return table|nil
function ESX.GetAccount(account)
    for _, entry in ipairs(ESX.PlayerData.accounts or {}) do
        if entry.name == account then return entry end
    end
end

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
