-- ESX on ai-core, server side: `exports.es_extended:getSharedObject()`, `esx:getSharedObject`, xPlayer and ESX's
-- server events. ESX's `money` account is ai-core's `cash`; every other account keeps its name.

local core = Bridge.core

---@param account string
---@return string
local function aiAccount(account) return account == 'money' and 'cash' or account end
---@param account string
---@return string
local function esxAccount(account) return account == 'cash' and 'money' or account end

---@class ESXJob
---@field id integer
---@field name string
---@field label string
---@field grade integer
---@field grade_name string
---@field grade_label string
---@field grade_salary number
---@field skin_male table
---@field skin_female table
---@field onDuty boolean

---@param job BridgeJob
---@return ESXJob
local function esxJob(job)
    return { id = 0, name = job.name, label = job.label, grade = job.grade, grade_name = job.gradeLabel:lower():gsub('%s+', '_'), grade_label = job.gradeLabel, grade_salary = job.salary, skin_male = {}, skin_female = {}, onDuty = job.onDuty }
end

---@class ESXAccount
---@field name string
---@field money number
---@field label string

---@param mirror BridgeMirror
---@return ESXAccount[]
local function accountsOf(mirror)
    local types = core:GetAccountTypes() or {}
    local out = {}
    for name, balance in pairs(mirror.money) do
        out[#out + 1] = { name = esxAccount(name), money = balance, label = types[name] and types[name].label or name }
    end
    return out
end

---@class xPlayer
---@field source integer
---@field playerId integer
---@field identifier string
---@field license string|nil
---@field name string
---@field job ESXJob
---@field group string
---@field variables table

---@type table<integer, xPlayer>
local xPlayers = {}

---@param source integer
---@return xPlayer|nil
local function build(source)
    local mirror = Bridge.players[source]
    if not mirror then return nil end
    local c = mirror.character
    local inv = Bridge.inventory
    local self = {
        source = source,
        playerId = source,
        identifier = c.citizenid,
        license = Bridge.license(source),
        name = ('%s %s'):format(c.firstname, c.lastname),
        job = esxJob(Bridge.jobOf(mirror)),
        group = Bridge.isAdmin(source) and 'admin' or 'user',
        variables = {},
    }
    function self.getName() return self.name end
    function self.getIdentifier() return self.identifier end
    function self.getGroup() return self.group end
    function self.getJob() return self.job end
    function self.setJob(job, grade) return core:SetJob(source, job, tonumber(grade) or 0) end
    function self.getMoney() return mirror.money.cash or 0 end
    function self.addMoney(amount, reason) return core:AddMoney(source, 'cash', amount, reason) end
    function self.removeMoney(amount, reason) return core:RemoveMoney(source, 'cash', amount, reason) end
    function self.setMoney(amount, reason) return core:SetMoney(source, 'cash', amount, reason) end
    function self.getAccounts() return accountsOf(mirror) end
    function self.getAccount(account)
        local name = aiAccount(account)
        if mirror.money[name] == nil then return nil end
        local types = core:GetAccountTypes() or {}
        return { name = account, money = mirror.money[name], label = types[name] and types[name].label or account }
    end
    function self.addAccountMoney(account, amount, reason) return core:AddMoney(source, aiAccount(account), amount, reason) end
    function self.removeAccountMoney(account, amount, reason) return core:RemoveMoney(source, aiAccount(account), amount, reason) end
    function self.setAccountMoney(account, amount, reason) return core:SetMoney(source, aiAccount(account), amount, reason) end
    function self.getInventory()
        local i = inv()
        local out = {}
        if not i then return out end
        for _, stack in ipairs(i:GetItems(source) or {}) do out[#out + 1] = { name = stack.name, label = stack.label, count = stack.count, slot = stack.slot, metadata = stack.metadata } end
        return out
    end
    function self.getInventoryItem(item)
        local i = inv()
        local definition = Bridge.itemDefinition(item)
        return { name = item, label = definition and definition.label or item, count = i and i:GetItemCount(source, item) or 0, weight = definition and definition.weight or 0 }
    end
    function self.hasItem(item)
        local found = self.getInventoryItem(item)
        return found.count > 0 and found or false, found.count
    end
    function self.addInventoryItem(item, count, metadata)
        local i = inv()
        return i ~= nil and i:AddItem(source, item, count or 1, metadata) or false
    end
    function self.removeInventoryItem(item, count, metadata)
        local i = inv()
        return i ~= nil and i:RemoveItem(source, item, count or 1, metadata) or false
    end
    function self.canCarryItem(item, count)
        local i = inv()
        return i ~= nil and i:CanCarryItem(source, item, count or 1) or false
    end
    function self.getCoords(vector)
        local coords = GetEntityCoords(GetPlayerPed(tostring(source)))
        return vector and coords or { x = coords.x, y = coords.y, z = coords.z }
    end
    function self.showNotification(text, kind, length) Bridge.notify(source, text, kind, length) end
    function self.showHelpNotification(msg, thisFrame, beep, duration) TriggerClientEvent('esx:showHelpNotification', source, msg, thisFrame, beep, duration) end
    function self.showAdvancedNotification(sender, subject, msg, textureDict, iconType, flash, saveToBrief, hudColorIndex)
        TriggerClientEvent('esx:showAdvancedNotification', source, sender, subject, msg, textureDict, iconType, flash, saveToBrief, hudColorIndex)
    end
    function self.triggerEvent(name, ...) TriggerClientEvent(name, source, ...) end
    function self.kick(reason) DropPlayer(tostring(source), reason or '') end
    function self.set(key, value) self.variables[key] = value end
    function self.get(key) return self.variables[key] end
    function self.getMeta(key) return core:GetMeta(source, key) end
    function self.setMeta(key, value) core:SetMeta(source, key, value) end
    xPlayers[source] = self --[[@as xPlayer]]
    return self --[[@as xPlayer]]
end

---@param source integer
---@return xPlayer|nil
local function getPlayerFromId(source)
    source = tonumber(source) --[[@as integer]]
    return xPlayers[source] or (Bridge.players[source] and build(source)) or nil
end

---@type table<string, fun(source: integer, cb: function, ...)>
local callbacks = {}

---@class ESXServer
---@field Math table ESX.Math (bridge/esx/shared.lua)
---@field Table table ESX.Table (bridge/esx/shared.lua)
ESX = { Players = xPlayers, Jobs = {} }

ESX.GetPlayerFromId = getPlayerFromId

---@param identifier string
function ESX.GetPlayerFromIdentifier(identifier)
    local source = Bridge.sourceByCitizenId(identifier)
    return source and getPlayerFromId(source) or nil
end

---@return integer[]
function ESX.GetPlayers()
    local out = {}
    for source in pairs(Bridge.players) do out[#out + 1] = source end
    return out
end

---@param key? 'job'|'group'
---@param value? string
---@return xPlayer[]
function ESX.GetExtendedPlayers(key, value)
    local out = {}
    for source in pairs(Bridge.players) do
        local x = getPlayerFromId(source)
        if x and (not key or (key == 'job' and x.job.name == value) or (key == 'group' and x.group == value)) then out[#out + 1] = x end
    end
    return out
end

function ESX.GetJobs()
    local out = {}
    for name, definition in pairs(Bridge.jobDefinitions()) do
        local grades = {}
        for i, grade in ipairs(definition.grades) do grades[tostring(i - 1)] = { grade = i - 1, name = grade.label:lower():gsub('%s+', '_'), label = grade.label, salary = grade.salary } end
        -- ai-core has no free-to-join flag: only unemployed counts as not whitelisted (job centers list nothing else).
        out[name] = { name = name, label = definition.label, whitelisted = name ~= 'unemployed', grades = grades }
    end
    return out
end

---@param name string
---@param cb fun(source: integer, cb: function, ...)
function ESX.RegisterServerCallback(name, cb)
    callbacks[name] = cb
end

---@param name string
---@param cb fun(source: integer, item?: table)
function ESX.RegisterUsableItem(name, cb)
    local inv = Bridge.inventory()
    if inv then inv:RegisterUsableItem(name, function(source, item) cb(source, item and item.name, item) end) end
end

--- Called by the inventory (ox_inventory, tgiann-inventory) when a player uses an item.
---@param source integer
---@param item string
function ESX.UseItem(source, item, ...)
    Bridge.useItem(source, item, ...)
end

---@param name string
function ESX.GetItemLabel(name)
    local definition = Bridge.itemDefinition(name)
    return definition and definition.label or name
end

---@param name string|string[]
---@param group string|string[]
---@param cb fun(xPlayer: xPlayer|false, args: table, showError: fun(msg: string))
---@param allowConsole? boolean
function ESX.RegisterCommand(name, group, cb, allowConsole)
    local names = type(name) == 'table' and name or { name }
    for _, command in ipairs(names) do
        RegisterCommand(command, function(source, args)
            if source == 0 and not allowConsole then return end
            cb(source ~= 0 and getPlayerFromId(source) or false, args, function(msg) print(msg) end)
        end, group ~= 'user')
    end
end

function ESX.GetExtendedPlayerCount() return #ESX.GetPlayers() end

--- The player object by server id or identifier (ESX's static player): the same functions as xPlayer.
---@param source integer|string
---@return xPlayer|nil
function ESX.Player(source)
    if type(source) == 'string' then return ESX.GetPlayerFromIdentifier(source) end
    return getPlayerFromId(source)
end

---@param source integer
function ESX.IsPlayerLoaded(source) return Bridge.players[tonumber(source)] ~= nil end

---@param identifier string
function ESX.GetPlayerIdFromIdentifier(identifier) return Bridge.sourceByCitizenId(identifier) end

---@param job string
---@param grade integer|string
function ESX.DoesJobExist(job, grade)
    local definition = Bridge.jobDefinitions()[job]
    return definition ~= nil and definition.grades[(tonumber(grade) or 0) + 1] ~= nil
end

---@param key? string
function ESX.GetConfig(key)
    local config = { Locale = GetConvar('esx:locale', 'en'), EnableDebug = false, CustomInventory = true, Multichar = true }
    if key then return config[key] end
    return config
end

RegisterNetEvent('esx:triggerServerCallback', function(name, requestId, invoker, ...)
    local src = source
    if type(name) ~= 'string' or not Bridge.allow(src) then return end
    local cb = callbacks[name]
    if not cb then return end
    cb(src, function(...)
        TriggerClientEvent('esx:serverCallback', src, requestId, invoker, ...)
    end, ...)
end)

AddEventHandler('esx:getSharedObject', function(cb)
    cb(ESX)
end)
Bridge.provideExport('es_extended', 'getSharedObject', function() return ESX end)

-- ESX's server events from ai-core's changes (same names and arguments as ESX).
Bridge.on('loaded', function(source)
    local x = build(source)
    ---@diagnostic disable-next-line: fivem/event-wrong-side -- ESX server scripts listen to it on the server too
    TriggerEvent('esx:playerLoaded', source, x, false)
end)

Bridge.on('unloaded', function(source, reason)
    if reason == 'dropped' then TriggerEvent('esx:playerDropped', source, reason)
    else TriggerEvent('esx:playerLogout', source) end
    xPlayers[source] = nil
end)

Bridge.on('job', function(source, job)
    local x = xPlayers[source]
    local last = x and x.job or nil
    local next = esxJob(job)
    if x then x.job = next end
    ---@diagnostic disable-next-line: fivem/event-wrong-side -- ESX server scripts listen to it on the server too
    TriggerEvent('esx:setJob', source, next, last)
end)

BridgeESX = { esxJob = esxJob, esxAccount = esxAccount }
