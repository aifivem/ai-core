-- ESX on ai-core, client side: ESX.PlayerData / GetPlayerData / TriggerServerCallback / ShowNotification and ESX's
-- client events, fired locally from the bridge mirror.

local function esxAccount(account) return account == 'cash' and 'money' or account end

---@param job table
local function esxJob(job)
    return { id = 0, name = job.name, label = job.label, grade = job.grade, grade_name = (job.gradeLabel:lower():gsub('%s+', '_')), grade_label = job.gradeLabel, grade_salary = job.salary, skin_male = {}, skin_female = {}, onDuty = job.onDuty }
end

---@class ESXClientPlayerData
---@field identifier string
---@field accounts { name: string, money: number, label: string }[]
---@field job table
---@field inventory table
---@field firstName string
---@field lastName string
---@field dateofbirth string
---@field sex string
---@field metadata table

---@class ESXClient
ESX = { PlayerData = {}, PlayerLoaded = false, Game = {} }

local function accounts()
    local out = {}
    for name, balance in pairs(BridgeClient.money) do out[#out + 1] = { name = esxAccount(name), money = balance, label = name } end
    return out
end

local function rebuild()
    local s = BridgeClient
    if not s.loaded or not s.character then
        ESX.PlayerData, ESX.PlayerLoaded = {}, false
        return
    end
    local c = s.character
    ESX.PlayerData = {
        identifier = c.citizenid,
        accounts = accounts(),
        job = esxJob(s.job),
        inventory = {},
        firstName = c.firstname,
        lastName = c.lastname,
        dateofbirth = c.birthdate,
        sex = c.sex == 'female' and 'f' or 'm',
        metadata = {},
    }
    ESX.PlayerLoaded = true
end

function ESX.GetPlayerData() return ESX.PlayerData end

---@param key? string
function ESX.GetConfig(key)
    local config = { Locale = GetConvar('esx:locale', 'en'), EnableDebug = false, CustomInventory = true, Multichar = true }
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

---@param key string
---@param value any
function ESX.SetPlayerData(key, value)
    ESX.PlayerData[key] = value
    TriggerEvent('esx:setPlayerData', key, value)
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

AddEventHandler('esx:getSharedObject', function(cb)
    cb(ESX)
end)
BridgeClient.provideExport('es_extended', 'getSharedObject', function() return ESX end)

BridgeClient.on('loaded', function()
    rebuild()
    TriggerEvent('esx:playerLoaded', ESX.PlayerData, false)
end)

BridgeClient.on('unloaded', function()
    TriggerEvent('esx:onPlayerLogout')
    rebuild()
end)

BridgeClient.on('money', function(account, balance)
    ESX.PlayerData.accounts = accounts()
    TriggerEvent('esx:setAccountMoney', { name = esxAccount(account), money = balance, label = account })
end)

BridgeClient.on('job', function(job, last)
    local next = esxJob(job)
    ESX.PlayerData.job = next
    TriggerEvent('esx:setJob', next, last and esxJob(last) or nil)
end)
