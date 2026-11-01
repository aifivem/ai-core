-- QBCore.Shared's jobs, gangs and items on the client (from ai-core's client and the server's Shared updates) and
-- the core object another resource gets (`exports['qb-core']:GetCoreObject`, `GetShared`, `QBCore:GetObject`).

local PVP_KEY = BridgeQBClient.pvpKey

local sharedJob, sharedGang = BridgeShapes.qbJobDefinition, BridgeShapes.qbGangDefinition

local sharedReady = false

--- Fills QBCore.Shared's jobs, gangs and items once from ai-core's client (vehicles and weapons:
--- bridge/qb/shared/methods.lua); after that they follow ai-core's definition changes and the server's Shared updates (items
--- scripts add with `QBCore.Functions.AddItem`).
local function ensureShared()
    if sharedReady then return end
    sharedReady = true
    local S = QBCore.Shared
    S.Jobs, S.Gangs, S.Items = S.Jobs or {}, S.Gangs or {}, S.Items or {}
    local core = exports['ai-core']
    for name, definition in pairs(core:GetDefinitions('jobs') or {}) do S.Jobs[name] = sharedJob(definition) end
    for name, definition in pairs(core:GetDefinitions('gangs') or {}) do S.Gangs[name] = sharedGang(definition) end
    for name, definition in pairs(core:GetItemDefinitions() or {}) do S.Items[name] = BridgeShapes.qbItem(name, definition) end
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

-- The active inventory's item definitions (ai-core's client mirror: the first change carries every item); before the
-- first use the whole mirror is read instead.
AddEventHandler('ai-core:client:itemDefinitionsChanged', function(changes)
    if not sharedReady or type(changes) ~= 'table' then return end
    local items = QBCore.Shared.Items
    for name, definition in pairs(changes) do
        items[name] = type(definition) == 'table' and BridgeShapes.qbItem(name, definition) or nil
    end
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

BridgeQBClient.coreObject = coreObject
