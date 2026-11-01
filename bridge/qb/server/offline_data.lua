-- QB PlayerData of a stored character that is not loaded (ai-core's `GetOfflineCharacter`).

--- qb-core's `applyDefaults`; `generate` false leaves the made-on-demand values (ids, money) out.
---@param target table
---@param defaults table
---@param generate boolean
local function applyDefaults(target, defaults, generate)
    for key, value in pairs(defaults) do
        if BridgeQB.isCallable(value) then
            if target[key] == nil and generate then target[key] = value() end
        elseif type(value) == 'table' then
            if target[key] == nil then target[key] = {} end
            if type(target[key]) == 'table' then applyDefaults(target[key], value, generate) end
        elseif target[key] == nil then
            target[key] = value
        end
    end
end

local copy, CHARINFO_KEY = BridgeQB.copy, BridgeQB.charinfoKey
local qbJob, qbGang = BridgeShapes.qbJob, BridgeShapes.qbGang

--- PlayerData keys an offline Player never takes from `SetPlayerData` (ai-core owns them).
local OWNED = { source = true, citizenid = true, cid = true, license = true, money = true, items = true }

---@class AiStoredCharacter: AiCharacter
---@field userId integer the account id

---@class AiOfflineCharacter
---@field info AiStoredCharacter
---@field money table<string, number>
---@field jobs AiJobMembership[]
---@field gangs AiGangMembership[]
---@field activeGang string|nil
---@field metadata table<string, any>
---@field position { x: number, y: number, z: number, heading: number }|nil
---@field source integer|nil

--- The stored character behind each offline Player the bridge built (Qbox adds its fields from it).
---@type table<table, AiOfflineCharacter>
local offlineCharacters = setmetatable({}, { __mode = 'k' })

--- The job a stored character shows: ai-core's current job without duty (its last duty job, else the first, else
--- unemployed).
---@param character AiOfflineCharacter
---@return AiJobMembership
local function storedJob(character)
    local last = character.metadata.lastDutyJob
    for _, m in ipairs(character.jobs) do
        if m.job == last then return m end
    end
    return character.jobs[1] or { job = 'unemployed', grade = 0 }
end

---@param job AiJobMembership
---@return QBJob
local function jobView(job)
    return qbJob(Bridge.jobOf({ job = job }))
end

---@param gangs AiGangMembership[]
---@param active string|nil
---@return QBGang
local function gangView(gangs, active)
    return qbGang(Bridge.gangOf({ gangs = gangs, activeGang = active }))
end

--- QB PlayerData of a stored character (ai-core's `GetOfflineCharacter`).
---@param character AiOfflineCharacter
---@return QBPlayerData
local function offlineData(character)
    local info = character.info
    local extra = type(character.metadata[CHARINFO_KEY]) == 'table' and character.metadata[CHARINFO_KEY] or {}
    local at = character.position or QBCore.Config.DefaultSpawn
    local data = {
        citizenid = info.citizenid,
        cid = info.slot,
        name = ('%s %s'):format(info.firstname, info.lastname),
        money = copy(character.money),
        charinfo = {
            firstname = info.firstname, lastname = info.lastname, birthdate = info.birthdate, gender = info.sex == 'female' and 1 or 0,
            nationality = info.nationality or '', phone = tostring(extra.phone or ''), account = extra.account or '', card = extra.card,
        },
        job = jobView(storedJob(character)),
        gang = gangView(character.gangs, character.activeGang),
        metadata = BridgeQB.metadataOf({ metadata = character.metadata }),
        position = vector3(at.x, at.y, at.z),
        items = {},
        optin = character.metadata.optin ~= false,
    }
    applyDefaults(data, QBCore.Config.Player.PlayerDefaults, false)
    return data --[[@as QBPlayerData]]
end

BridgeQB.applyDefaults = applyDefaults
BridgeQB.offlineCharacters = offlineCharacters
BridgeQB.offlineData = offlineData
BridgeQB.jobView = jobView
BridgeQB.gangView = gangView
BridgeQB.offlineOwned = OWNED
