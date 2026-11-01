-- QBCore on ai-core, client side: PlayerData built from the bridge mirror (bridge/core/client/mirror.lua, fed by ai-core's
-- player data channel), the client QBCore object and QBCore's client events fired locally from the mirror's changes.
-- Creates the client's QB namespace `BridgeQBClient`, filled by the files after it.

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

BridgeQBClient = {}

---@param cb? fun(data: table)
---@return table
function QBCore.Functions.GetPlayerData(cb)
    if cb then cb(PlayerData) end
    return PlayerData
end

--- Balances the last money events were sent for (QB's OnMoneyChange carries the change, not the balance).
---@type table<string, number>
local lastMoney = {}

--- qb-core's client sets `isLoggedIn` when `QBCore:Client:OnPlayerLoaded` arrives.
local function loggedIn()
    if BridgeClient.loaded and not LocalPlayer.state.isLoggedIn then LocalPlayer.state:set('isLoggedIn', true, false) end
end

-- An external character screen (or its spawn, qb-spawn) fires OnPlayerLoaded itself, locally or from the server.
RegisterNetEvent('QBCore:Client:OnPlayerLoaded', loggedIn)

-- Under an external character screen the data loads at login and OnPlayerLoaded is that screen's; qb-core's own login
-- does not fire it either.
BridgeClient.on('loaded', function(_, external)
    rebuild()
    QBCore.PlayerData = PlayerData
    for account, balance in pairs(BridgeClient.money) do lastMoney[account] = balance end
    if not external then LocalPlayer.state:set('isLoggedIn', true, false) end
    TriggerEvent('QBCore:Player:SetPlayerData', PlayerData)
    TriggerEvent('QBCore:Client:OnPlayerUpdated', 'all', PlayerData)
    TriggerEvent('QBCore:Client:OnJobUpdate', PlayerData.job)
    TriggerEvent('QBCore:Client:OnGangUpdate', PlayerData.gang)
    if not external then TriggerEvent('QBCore:Client:OnPlayerLoaded') end
end)

-- A screen that never fires OnPlayerLoaded still leaves the player logged in once they stand in the world.
BridgeClient.on('spawned', loggedIn)

-- The license comes on its own bridge event, after the data of a character an external screen loaded.
RegisterNetEvent('ai-core:bridge:license', function(license)
    if PlayerData.citizenid then PlayerData.license = license end
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

BridgeQBClient.pvpKey = PVP_KEY
BridgeQBClient.getPlayerData = function() return PlayerData end
