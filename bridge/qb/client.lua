-- QBCore on ai-core, client side: QBCore.Functions.GetPlayerData / TriggerCallback / Notify and QBCore's client
-- events, fired locally from the bridge mirror (the network only carries the snapshot and the patches).

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

---@param job table
local function qbJob(job)
    return { name = job.name, label = job.label, type = job.type, payment = job.salary, onduty = job.onDuty, isboss = job.boss, grade = { name = job.gradeLabel, level = job.grade } }
end

---@param gang table
local function qbGang(gang)
    return { name = gang.name, label = gang.label, isboss = gang.boss, grade = { name = gang.gradeLabel, level = gang.grade } }
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
        metadata = {},
        items = {},
    }
end

---@class QBCoreClient
QBCore = { Functions = {}, Shared = {}, PlayerData = PlayerData }

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

---@param text string|table
---@param kind? string
---@param length? integer
function QBCore.Functions.Notify(text, kind, length)
    BridgeClient.notify(text, kind, length)
end

--- The closest other player to `coords` (default: the local ped) and the distance.
---@param coords? vector3
---@return integer, number
function QBCore.Functions.GetClosestPlayer(coords)
    local ped = PlayerPedId()
    coords = coords or GetEntityCoords(ped)
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
---@param coords? vector3
---@return integer, number
function QBCore.Functions.GetClosestVehicle(coords)
    coords = coords or GetEntityCoords(PlayerPedId())
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

AddEventHandler('QBCore:GetObject', function(cb)
    cb(QBCore)
end)
BridgeClient.provideExport('qb-core', 'GetCoreObject', function() return QBCore end)

BridgeClient.on('loaded', function()
    rebuild()
    QBCore.PlayerData = PlayerData
    TriggerEvent('QBCore:Client:OnPlayerLoaded')
    TriggerEvent('QBCore:Player:SetPlayerData', PlayerData)
end)

BridgeClient.on('unloaded', function()
    TriggerEvent('QBCore:Client:OnPlayerUnload')
    rebuild()
    QBCore.PlayerData = PlayerData
end)

BridgeClient.on('money', function(account, balance)
    TriggerEvent('QBCore:Client:OnMoneyChange', account, balance)
    TriggerEvent('QBCore:Player:SetPlayerData', PlayerData)
end)

BridgeClient.on('job', function(job, last)
    local onDutyChanged = last and last.onDuty ~= job.onDuty
    PlayerData.job = qbJob(job)
    TriggerEvent('QBCore:Client:OnJobUpdate', PlayerData.job)
    if onDutyChanged then TriggerEvent('QBCore:Client:SetDuty', job.onDuty) end
    TriggerEvent('QBCore:Player:SetPlayerData', PlayerData)
end)

BridgeClient.on('gang', function(gang)
    PlayerData.gang = qbGang(gang)
    TriggerEvent('QBCore:Client:OnGangUpdate', PlayerData.gang)
    TriggerEvent('QBCore:Player:SetPlayerData', PlayerData)
end)

BridgeQBClient = { getPlayerData = function() return PlayerData end }
