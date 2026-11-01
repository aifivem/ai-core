-- The core object another resource gets (`exports['qb-core']:GetCoreObject`, `QBCore:GetObject`) and
-- `exports['qb-core']:GetShared`.

local core = Bridge.core
local sharedJobs, sharedGangs, sharedItems = BridgeQB.sharedJobs, BridgeQB.sharedGangs, BridgeQB.sharedItems

--- The core object another resource gets is a copy: its Shared tables and live config values are filled at that
--- moment. `filters` (QB 1.3) picks only those top-level keys.
---@param filters? string[]
---@return QBCoreServer|table
local function coreObject(filters)
    QBCore.Shared.Jobs = sharedJobs()
    QBCore.Shared.Gangs = sharedGangs()
    QBCore.Shared.Items = sharedItems()
    local types = core:GetAccountTypes() or {}
    local moneyTypes, noMinus = {}, {}
    for name, definition in pairs(types) do
        moneyTypes[name] = definition.start
        if not definition.allowNegative then noMinus[#noMinus + 1] = name end
    end
    if next(moneyTypes) then
        QBCore.Config.Money.MoneyTypes = moneyTypes
        QBCore.Config.Money.DontAllowMinus = noMinus
    end
    QBCore.Config.Server.PVP = GlobalState['ai:pvp'] ~= false
    if type(filters) ~= 'table' then return QBCore end
    local out = {}
    for _, key in ipairs(filters) do
        if QBCore[key] ~= nil then out[key] = QBCore[key] end
    end
    return out
end

AddEventHandler('QBCore:GetObject', function(cb)
    cb(coreObject())
end)
Bridge.provideExport('qb-core', 'GetCoreObject', coreObject)

local Shared = QBCore.Shared

--- QB 1.3 `exports['qb-core']:GetShared(namespace, item?)`.
---@param namespace string
---@param item? string|integer
---@return any
local function getShared(namespace, item)
    local data = namespace == 'Jobs' and BridgeQB.sharedJobs()
        or namespace == 'Gangs' and BridgeQB.sharedGangs()
        or namespace == 'Items' and BridgeQB.sharedItems()
        or Shared[namespace]
    if type(data) ~= 'table' then return nil end
    if item ~= nil then return data[item] end
    return data
end
Bridge.provideExport('qb-core', 'GetShared', getShared)

BridgeQB.coreObject = coreObject
