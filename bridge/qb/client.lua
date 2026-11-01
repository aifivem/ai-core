-- QBCore on ai-core, client side: the core object (`GetCoreObject`, `QBCore:GetObject`, `GetShared`), PlayerData and
-- QBCore's client events fired locally from the bridge mirror (bridge/core/client.lua, fed by ai-core's player data
-- channel), server and client callbacks, and QBCore.Shared's data tables. Shared helpers and Config live in
-- client_shared.lua, the remaining QBCore.Functions in client_functions.lua and ui.lua.

---@class QBClientPlayerData
---@field citizenid string
---@field cid integer
---@field license string|nil
---@field name string|nil
---@field money table<string, number>
---@field charinfo table
---@field job table
---@field gang table
---@field metadata table
---@field items table

local qbJob, qbGang = BridgeShapes.qbJob, BridgeShapes.qbGang

--- QB's metadata defaults under ai-core's character metadata.
local META_DEFAULTS = { hunger = 100, thirst = 100, stress = 0, isdead = false, inlaststand = false, ishandcuffed = false, armor = 0, injail = 0, licences = {} }

--- ai-core's PvP switch (GlobalState, panel setting; `CORE.pvpStateKey`).
local PVP_KEY = 'ai:pvp'

---@return table<string, any>
local function metadata()
    local out = {}
    for key, value in pairs(META_DEFAULTS) do out[key] = value end
    for key, value in pairs(BridgeClient.metadata) do out[key] = value end
    return out
end

---@type QBClientPlayerData|table
local PlayerData = {}

local function rebuild()
    local s = BridgeClient
    if not s.loaded or not s.character then
        PlayerData = {}
        return
    end
    local c = s.character
    PlayerData = {
        source = GetPlayerServerId(PlayerId()),
        citizenid = c.citizenid,
        cid = c.slot,
        license = s.license,
        name = s.name,
        money = s.money,
        charinfo = { firstname = c.firstname, lastname = c.lastname, birthdate = c.birthdate, gender = c.sex == 'female' and 1 or 0, nationality = c.nationality or '', phone = '', account = '' },
        job = qbJob(s.job),
        gang = qbGang(s.gang),
        metadata = metadata(),
        items = {},
    }
end

---@class QBCoreClient
---@field Functions table<string, function>
---@field Shared table<string, any>
---@field Config table<string, any>
---@field PlayerData QBClientPlayerData|table
---@field ClientCallbacks table<string, function>
---@field ServerCallbacks table<string, function>
---@field Debug fun(resource: string, obj: any, depth?: integer)
QBCore = { Functions = {}, Shared = {}, Config = {}, PlayerData = PlayerData, ClientCallbacks = {}, ServerCallbacks = {} }

---@param coords? vector3|vector4|table
---@return vector3
local function origin(coords)
    if coords then return vector3(coords.x, coords.y, coords.z) end
    return GetEntityCoords(PlayerPedId())
end

---@param cb? fun(data: table)
---@return table
function QBCore.Functions.GetPlayerData(cb)
    if cb then cb(PlayerData) end
    return PlayerData
end

--- `TriggerCallback(name, cb, ...)` answers `cb`; without a callback first it waits and returns the answer.
---@param name string
---@return any
function QBCore.Functions.TriggerCallback(name, ...)
    local cb = ...
    if BridgeUI.isCallable(cb) then return BridgeClient.qbCallback(name, cb, select(2, ...)) end
    local p = promise.new()
    BridgeClient.qbCallback(name, function(...) p:resolve({ ... }) end, ...)
    return table.unpack(Citizen.Await(p))
end

--- A handler the server asks with `QBCore.Functions.TriggerClientCallback(name, source, ...)`: `cb(respond, ...)`.
---@param name string
---@param cb fun(respond: fun(...), ...)
function QBCore.Functions.CreateClientCallback(name, cb)
    QBCore.ClientCallbacks[name] = cb
end

aiLib.onServerEvent('QBCore:Client:TriggerClientCallback', function(name, ...)
    local cb = QBCore.ClientCallbacks[name]
    if not cb then return end
    BridgeUI.call(cb, function(...) TriggerServerEvent('QBCore:Server:TriggerClientCallback', name, ...) end, ...)
end)

--- qb-core prints the table on the server console; here it is printed in the client console (F8).
---@param resource string
---@param obj any
---@param _depth? integer
function QBCore.Debug(resource, obj, _depth)
    print(('^5[%s]^0 %s'):format(resource or GetInvokingResource() or 'qb-core', type(obj) == 'table' and json.encode(obj, { indent = true }) or tostring(obj)))
end

---@param text string|table
---@param kind? string
---@param length? integer
---@param _icon? string
function QBCore.Functions.Notify(text, kind, length, _icon)
    BridgeClient.notify(text, kind, length)
end

--- The closest other player to `coords` (default: the local ped) and the distance.
---@param coords? vector3|table
---@return integer, number
function QBCore.Functions.GetClosestPlayer(coords)
    coords = origin(coords)
    local closest, distance = -1, -1
    for _, player in ipairs(GetActivePlayers()) do
        if player ~= PlayerId() then
            local d = #(coords - GetEntityCoords(GetPlayerPed(player)))
            if distance == -1 or d < distance then closest, distance = player, d end
        end
    end
    return closest, distance
end

--- The closest vehicle to `coords` and the distance.
---@param coords? vector3|table
---@return integer, number
function QBCore.Functions.GetClosestVehicle(coords)
    coords = origin(coords)
    local closest, distance = -1, -1
    for _, vehicle in ipairs(GetGamePool('CVehicle')) do
        local d = #(coords - GetEntityCoords(vehicle))
        if distance == -1 or d < distance then closest, distance = vehicle, d end
    end
    return closest, distance
end

---@param vehicle integer
function QBCore.Functions.GetPlate(vehicle)
    return vehicle ~= 0 and (GetVehicleNumberPlateText(vehicle):gsub('^%s*(.-)%s*$', '%1')) or nil
end

-- Shared data ---------------------------------------------------------------------------------------------------------

local sharedJob, sharedGang = BridgeShapes.qbJobDefinition, BridgeShapes.qbGangDefinition

local sharedReady = false

--- Fills QBCore.Shared's jobs and gangs once from ai-core's client (vehicles and weapons: bridge/qb/shared.lua);
--- after that they follow ai-core's definition changes and the server's Shared updates.
local function ensureShared()
    if sharedReady then return end
    sharedReady = true
    local S = QBCore.Shared
    S.Jobs, S.Gangs, S.Items = S.Jobs or {}, S.Gangs or {}, S.Items or {}
    for name, definition in pairs(exports['ai-core']:GetDefinitions('jobs') or {}) do S.Jobs[name] = sharedJob(definition) end
    for name, definition in pairs(exports['ai-core']:GetDefinitions('gangs') or {}) do S.Gangs[name] = sharedGang(definition) end
end

local updateQueued = false

--- `QBCore:Client:UpdateObject` (scripts fetch the core object again), once for a burst of changes.
local function queueUpdateObject()
    if updateQueued then return end
    updateQueued = true
    SetTimeout(250, function()
        updateQueued = false
        TriggerEvent('QBCore:Client:UpdateObject')
    end)
end

AddEventHandler('ai-core:client:definitions', function(file, name, value)
    if not sharedReady or (file ~= 'jobs' and file ~= 'gangs') then return end
    local list = file == 'jobs' and QBCore.Shared.Jobs or QBCore.Shared.Gangs
    list[name] = value and (file == 'jobs' and sharedJob(value) or sharedGang(value)) or nil
    queueUpdateObject()
end)

---@param tableName any
---@return table|nil
local function sharedTable(tableName)
    if type(tableName) ~= 'string' then return nil end
    local list = QBCore.Shared[tableName]
    if type(list) ~= 'table' then
        list = {}
        QBCore.Shared[tableName] = list
    end
    return list
end

-- qb-core's server Shared updates (sent by a server script, e.g. the server bridge's item snapshot).
aiLib.onServerEvent('QBCore:Client:OnSharedUpdate', function(tableName, key, value)
    local list = sharedTable(tableName)
    if not list or key == nil then return end
    list[key] = value
    queueUpdateObject()
end)

aiLib.onServerEvent('QBCore:Client:OnSharedUpdateMultiple', function(tableName, values)
    local list = sharedTable(tableName)
    if not list or type(values) ~= 'table' then return end
    for key, value in pairs(values) do list[key] = value end
    queueUpdateObject()
end)

-- The whole Shared table: its data tables are taken, the bridge's helper functions stay.
aiLib.onServerEvent('QBCore:Client:SharedUpdate', function(shared)
    if type(shared) ~= 'table' then return end
    for name, value in pairs(shared) do
        if type(name) == 'string' and type(value) == 'table' then QBCore.Shared[name] = value end
    end
    queueUpdateObject()
end)

--- The core object another resource gets (a copy): QB's `GetCoreObject(filters)` returns only the listed keys.
---@param filters? string[]
---@return table
local function coreObject(filters)
    ensureShared()
    QBCore.Config.Server.PVP = GlobalState[PVP_KEY] ~= false
    if type(filters) ~= 'table' then return QBCore end
    local out = {}
    for _, key in ipairs(filters) do
        if QBCore[key] ~= nil then out[key] = QBCore[key] end
    end
    return out
end

--- `exports['qb-core']:GetShared(namespace, item)`: one Shared table or one entry of it.
---@param namespace string
---@param item? any
---@return any
local function getShared(namespace, item)
    ensureShared()
    local list = QBCore.Shared[namespace]
    if type(list) ~= 'table' then return nil end
    if item ~= nil then return list[item] end
    return list
end

AddEventHandler('QBCore:GetObject', function(cb)
    cb(coreObject())
end)
BridgeClient.provideExport('qb-core', 'GetCoreObject', coreObject)
BridgeClient.provideExport('qb-core', 'GetShared', getShared)

-- QBCore's client events from ai-core's changes ----------------------------------------------------------------------

--- Balances the last money events were sent for (QB's OnMoneyChange carries the change, not the balance).
---@type table<string, number>
local lastMoney = {}

BridgeClient.on('loaded', function()
    rebuild()
    QBCore.PlayerData = PlayerData
    for account, balance in pairs(BridgeClient.money) do lastMoney[account] = balance end
    LocalPlayer.state:set('isLoggedIn', true, false)
    TriggerEvent('QBCore:Player:SetPlayerData', PlayerData)
    TriggerEvent('QBCore:Client:OnPlayerUpdated', 'all', PlayerData)
    TriggerEvent('QBCore:Client:OnJobUpdate', PlayerData.job)
    TriggerEvent('QBCore:Client:OnGangUpdate', PlayerData.gang)
    TriggerEvent('QBCore:Client:OnPlayerLoaded')
end)

BridgeClient.on('unloaded', function()
    LocalPlayer.state:set('isLoggedIn', false, false)
    TriggerEvent('QBCore:Client:OnPlayerUnload')
    rebuild()
    QBCore.PlayerData = PlayerData
    lastMoney = {}
end)

BridgeClient.on('money', function(account, balance)
    local change = balance - (lastMoney[account] or 0)
    lastMoney[account] = balance
    TriggerEvent('QBCore:Client:OnMoneyChange', account, math.abs(change), change >= 0 and 'add' or 'remove')
    TriggerEvent('hud:client:OnMoneyChange', account, math.abs(change), change < 0)
    TriggerEvent('QBCore:Client:OnPlayerUpdated', 'money', PlayerData.money)
    TriggerEvent('QBCore:Player:SetPlayerData', PlayerData)
end)

BridgeClient.on('job', function(job, last)
    local onDutyChanged = last and last.onDuty ~= job.onDuty
    PlayerData.job = qbJob(job)
    TriggerEvent('QBCore:Client:OnPlayerUpdated', 'job', PlayerData.job)
    TriggerEvent('QBCore:Client:OnJobUpdate', PlayerData.job)
    if onDutyChanged then TriggerEvent('QBCore:Client:SetDuty', job.onDuty) end
    TriggerEvent('QBCore:Player:SetPlayerData', PlayerData)
end)

BridgeClient.on('gang', function(gang)
    PlayerData.gang = qbGang(gang)
    TriggerEvent('QBCore:Client:OnPlayerUpdated', 'gang', PlayerData.gang)
    TriggerEvent('QBCore:Client:OnGangUpdate', PlayerData.gang)
    TriggerEvent('QBCore:Player:SetPlayerData', PlayerData)
end)

BridgeClient.on('meta', function(key, value)
    if not PlayerData.metadata then return end
    if value == nil then value = META_DEFAULTS[key] end
    PlayerData.metadata[key] = value
    TriggerEvent('QBCore:Client:OnPlayerUpdated', 'metadata', PlayerData.metadata)
    TriggerEvent('QBCore:Player:SetPlayerData', PlayerData)
end)

-- qb-core's /pvp sends this; on ai-core the panel's PvP switch does (ai-core applies the natives itself).
AddStateBagChangeHandler(PVP_KEY, 'global', function(_, _, value)
    TriggerEvent('QBCore:Client:PvpHasToggled', value ~= false)
end)

BridgeQBClient = { getPlayerData = function() return PlayerData end, coreObject = coreObject }
