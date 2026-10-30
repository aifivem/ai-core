-- QBCore on ai-core, server side: `exports['qb-core']:GetCoreObject()`, `QBCore:GetObject`, the Player object and
-- QBCore's server events. Everything reads the shared mirror (bridge/core/server.lua) and writes through ai-core.

local core = Bridge.core

---@class QBJob
---@field name string
---@field label string
---@field type string
---@field payment number
---@field onduty boolean
---@field isboss boolean
---@field grade { name: string, level: integer }

---@class QBGang
---@field name string
---@field label string
---@field isboss boolean
---@field grade { name: string, level: integer }

---@class QBPlayerData
---@field source integer
---@field citizenid string
---@field cid integer
---@field license string|nil
---@field name string
---@field money table<string, number>
---@field charinfo { firstname: string, lastname: string, birthdate: string, gender: integer, nationality: string, phone: string, account: string }
---@field job QBJob
---@field gang QBGang
---@field metadata table<string, any>
---@field items table

---@class QBPlayerFunctions
---@field AddMoney fun(moneytype: string, amount: number, reason?: string): boolean
---@field RemoveMoney fun(moneytype: string, amount: number, reason?: string): boolean
---@field SetMoney fun(moneytype: string, amount: number, reason?: string): boolean
---@field GetMoney fun(moneytype: string): number|false
---@field SetJob fun(job: string, grade?: integer|string): boolean
---@field SetJobDuty fun(onDuty: boolean)
---@field SetGang fun(gang: string, grade?: integer|string): boolean
---@field SetMetaData fun(key: string, value: any)
---@field GetMetaData fun(key: string): any
---@field AddItem fun(item: string, amount: integer, slot?: integer, info?: table): boolean
---@field RemoveItem fun(item: string, amount: integer, slot?: integer): boolean
---@field GetItemByName fun(item: string): table|nil
---@field GetItemsByName fun(item: string): table[]
---@field Notify fun(text: string, type?: string, length?: integer)
---@field Save fun()
---@field UpdatePlayerData fun()

---@class QBPlayer
---@field PlayerData QBPlayerData
---@field Functions QBPlayerFunctions
---@field Offline boolean

local qbJob, qbGang = BridgeShapes.qbJob, BridgeShapes.qbGang

--- QB's metadata defaults under ai-core's character metadata (the mirror follows ai-core's `metaChanged`).
local META_DEFAULTS = { hunger = 100, thirst = 100, stress = 0, isdead = false, inlaststand = false, ishandcuffed = false, armor = 0, injail = 0, licences = {} }

---@param mirror BridgeMirror
---@return table<string, any>
local function metadataOf(mirror)
    local out = {}
    for key, value in pairs(META_DEFAULTS) do out[key] = value end
    for key, value in pairs(mirror.metadata) do out[key] = value end
    return out
end

---@type table<integer, QBPlayer>
local qbPlayers = {}

---@param source integer
---@return QBPlayer|nil
local function build(source)
    local mirror = Bridge.players[source]
    if not mirror then return nil end
    local c = mirror.character
    ---@type QBPlayerData
    local data = {
        source = source,
        citizenid = c.citizenid,
        cid = c.slot,
        license = Bridge.license(source),
        name = GetPlayerName(tostring(source)),
        money = mirror.money,
        charinfo = { firstname = c.firstname, lastname = c.lastname, birthdate = c.birthdate, gender = c.sex == 'female' and 1 or 0, nationality = c.nationality or '', phone = '', account = '' },
        job = qbJob(Bridge.jobOf(mirror)),
        gang = qbGang(Bridge.gangOf(mirror)),
        metadata = metadataOf(mirror),
        items = {},
    }
    local inv = Bridge.inventory
    ---@type QBPlayerFunctions
    local functions = {
        AddMoney = function(moneytype, amount, reason) return core:AddMoney(source, moneytype, amount, reason) end,
        RemoveMoney = function(moneytype, amount, reason) return core:RemoveMoney(source, moneytype, amount, reason) end,
        SetMoney = function(moneytype, amount, reason) return core:SetMoney(source, moneytype, amount, reason) end,
        GetMoney = function(moneytype)
            local amount = mirror.money[moneytype]
            return amount ~= nil and amount or false
        end,
        SetJob = function(job, grade) return core:SetJob(source, job, tonumber(grade) or 0) end,
        SetJobDuty = function(onDuty) core:SetDuty(source, onDuty and data.job.name or nil) end,
        SetGang = function(gang, grade) return core:SetGang(source, gang, tonumber(grade) or 0) end,
        SetMetaData = function(key, value) core:SetMeta(source, key, value) end,
        GetMetaData = function(key)
            local value = mirror.metadata[key]
            if value == nil then return META_DEFAULTS[key] end
            return value
        end,
        AddItem = function(item, amount, slot, info)
            local i = inv()
            return i ~= nil and i:AddItem(source, item, amount or 1, info, slot) or false
        end,
        RemoveItem = function(item, amount, slot)
            local i = inv()
            return i ~= nil and i:RemoveItem(source, item, amount or 1, nil, slot) or false
        end,
        GetItemByName = function(item)
            local i = inv()
            if not i then return nil end
            for _, stack in ipairs(i:GetItems(source) or {}) do
                if stack.name == item then return { name = stack.name, label = stack.label, amount = stack.count, count = stack.count, info = stack.metadata, slot = stack.slot } end
            end
        end,
        GetItemsByName = function(item)
            local i = inv()
            local out = {}
            if not i then return out end
            for _, stack in ipairs(i:GetItems(source) or {}) do
                if stack.name == item then out[#out + 1] = { name = stack.name, label = stack.label, amount = stack.count, count = stack.count, info = stack.metadata, slot = stack.slot } end
            end
            return out
        end,
        Notify = function(text, kind, length) Bridge.notify(source, text, kind, length) end,
        Save = function() end,
        UpdatePlayerData = function() end,
    }
    local player = { PlayerData = data, Functions = functions, Offline = false }
    qbPlayers[source] = player
    return player
end

--- The Player object, built once when the character loads and kept current by the mirror's changes.
---@param source integer
---@return QBPlayer|nil
local function getPlayer(source)
    source = tonumber(source) --[[@as integer]]
    if not Bridge.players[source] then return nil end
    return qbPlayers[source] or build(source)
end

---@param citizenid string
---@return QBPlayer|nil
local function getPlayerByCitizenId(citizenid)
    local source = Bridge.sourceByCitizenId(citizenid)
    return source and getPlayer(source) or nil
end

--- QBCore.Shared.Jobs / Gangs in QB's shape (grades keyed by their index as text).
local function sharedJobs()
    local out = {}
    for name, definition in pairs(Bridge.jobDefinitions()) do
        local grades = {}
        for i, grade in ipairs(definition.grades) do grades[tostring(i - 1)] = { name = grade.label, payment = grade.salary, isboss = grade.boss } end
        out[name] = { label = definition.label, type = definition.type, defaultDuty = definition.defaultDuty, offDutyPay = false, grades = grades }
    end
    return out
end

local function sharedGangs()
    local out = {}
    for name, definition in pairs(Bridge.gangDefinitions()) do
        local grades = {}
        for i, grade in ipairs(definition.grades) do grades[tostring(i - 1)] = { name = grade.label, isboss = grade.boss } end
        out[name] = { label = definition.label, grades = grades }
    end
    return out
end

---@type table<string, fun(source: integer, cb: function, ...)>
local callbacks = {}

---@class QBCoreServer
QBCore = {
    Players = qbPlayers,
    Config = { Money = { MoneyTypes = { cash = 500, bank = 5000, crypto = 0 } } },
    Shared = { Jobs = {}, Gangs = {}, Items = {} },
    Commands = {},
    Functions = {},
}

QBCore.Functions.GetPlayer = getPlayer
QBCore.Functions.GetPlayerByCitizenId = getPlayerByCitizenId
QBCore.Functions.GetOfflinePlayerByCitizenId = getPlayerByCitizenId

---@return integer[]
function QBCore.Functions.GetPlayers()
    local out = {}
    for source in pairs(Bridge.players) do out[#out + 1] = source end
    return out
end

---@return table<integer, QBPlayer>
function QBCore.Functions.GetQBPlayers()
    return qbPlayers
end

---@param source integer
---@param idtype? string
function QBCore.Functions.GetIdentifier(source, idtype)
    return GetPlayerIdentifierByType(tostring(source), idtype or 'license')
end

function QBCore.Functions.Notify(source, text, kind, length)
    Bridge.notify(source, text, kind, length)
end

---@param name string
---@param cb fun(source: integer, cb: function, ...)
function QBCore.Functions.CreateCallback(name, cb)
    callbacks[name] = cb
end

---@param name string
---@param cb fun(source: integer, item: table)
function QBCore.Functions.CreateUseableItem(name, cb)
    local inv = Bridge.inventory()
    if inv then inv:RegisterUsableItem(name, function(source, item) cb(source, { name = item.name, amount = item.count, info = item.metadata, slot = item.slot }) end) end
end

--- What the inventory (qb-inventory, tgiann-inventory) calls when a player uses an item: QB's `{ func }` entry or nil.
---@param name string
---@return { func: fun(source: integer, item?: table): any, resource: string }|nil
function QBCore.Functions.CanUseItem(name)
    if not core:IsUsableItem(name) then return nil end
    return { func = function(source, item) return Bridge.useItem(source, name, item) end, resource = 'ai-core' }
end

---@param source integer
---@param items string|string[]
---@param amount? integer
function QBCore.Functions.HasItem(source, items, amount)
    local inv = Bridge.inventory()
    if not inv then return false end
    if type(items) == 'string' then return inv:GetItemCount(source, items) >= (amount or 1) end
    for _, item in ipairs(items) do
        if inv:GetItemCount(source, item) < (amount or 1) then return false end
    end
    return true
end

---@param name string
---@param help string
---@param _arguments table
---@param _required boolean
---@param cb fun(source: integer, args: string[])
---@param permission? string
function QBCore.Commands.Add(name, help, _arguments, _required, cb, permission)
    aiLib.addCommand(name, { help = help, restricted = permission ~= nil and permission ~= 'user' }, function(source, _, raw)
        cb(source, Bridge.words(raw))
    end)
end

RegisterNetEvent('QBCore:Server:TriggerCallback', function(name, ...)
    local src = source
    if type(name) ~= 'string' or not Bridge.allow(src) then return end
    local cb = callbacks[name]
    if not cb then return end
    cb(src, function(...)
        TriggerClientEvent('QBCore:Client:TriggerCallback', src, name, ...)
    end, ...)
end)

--- The core object another resource gets is a copy: its Shared tables are filled at that moment.
---@return QBCoreServer
local function coreObject()
    QBCore.Shared.Jobs = sharedJobs()
    QBCore.Shared.Gangs = sharedGangs()
    QBCore.Shared.Items = Bridge.itemDefinitions()
    return QBCore
end

AddEventHandler('QBCore:GetObject', function(cb)
    cb(coreObject())
end)
Bridge.provideExport('qb-core', 'GetCoreObject', coreObject)

-- QBCore's server events from ai-core's changes (same names and arguments as QBCore).
Bridge.on('loaded', function(source)
    local player = build(source)
    TriggerEvent('QBCore:Server:PlayerLoaded', player)
end)

Bridge.on('unloaded', function(source)
    TriggerEvent('QBCore:Server:OnPlayerUnload', source)
    qbPlayers[source] = nil
end)

Bridge.on('money', function(source, account, _, delta, reason)
    TriggerEvent('QBCore:Server:OnMoneyChange', source, account, math.abs(delta), delta >= 0 and 'add' or 'remove', reason)
end)

Bridge.on('job', function(source, job)
    local player = qbPlayers[source]
    if player then player.PlayerData.job = qbJob(job) end
    TriggerEvent('QBCore:Server:OnJobUpdate', source, qbJob(job))
end)

Bridge.on('gang', function(source, gang)
    local player = qbPlayers[source]
    if player then player.PlayerData.gang = qbGang(gang) end
    TriggerEvent('QBCore:Server:OnGangUpdate', source, qbGang(gang))
end)

Bridge.on('meta', function(source, key, value)
    local player = qbPlayers[source]
    if not player then return end
    if value == nil then value = META_DEFAULTS[key] end
    player.PlayerData.metadata[key] = value
end)

BridgeQB = { getPlayer = getPlayer, getPlayerByCitizenId = getPlayerByCitizenId, qbJob = qbJob, sharedJobs = sharedJobs, sharedGangs = sharedGangs, coreObject = coreObject }
