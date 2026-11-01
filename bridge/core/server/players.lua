-- ai-core's framework bridge, server side: the shared mirror of the loaded players (`Bridge.players`, O(1) indexes by
-- citizenid and on-duty job) and the change listeners the framework parts hear. Loaded and unloaded here; money, job,
-- gang and metadata changes: changes.lua.

local core = Bridge.core

---@class AiJobMembership
---@field job string
---@field grade integer

---@class AiGangMembership
---@field gang string
---@field grade integer

---@class AiCharacter
---@field id integer
---@field citizenid string
---@field slot integer
---@field firstname string
---@field lastname string
---@field birthdate string
---@field sex 'male'|'female'
---@field nationality string

---@class BridgeMirror
---@field source integer
---@field character AiCharacter
---@field money table<string, number>
---@field jobs AiJobMembership[]
---@field duty string|nil
---@field job AiJobMembership the job other scripts see (ai-core's current job: on duty, else last on duty, else the first, else unemployed)
---@field gangs AiGangMembership[]
---@field activeGang string|nil
---@field metadata table<string, any>

---@type table<integer, BridgeMirror>
Bridge.players = {}

---@type table<string, integer> citizenid -> source of the loaded characters
local byCitizen = {}

---@type table<string, table<integer, true>> job -> on-duty sources
local onDuty = {}

--- Calls `fn(...)` for every part (ESX, QB) that wants to hear a player change.
---@type table<string, fun(source: integer, ...)[]>
local listeners = { loaded = {}, unloaded = {}, money = {}, job = {}, gang = {}, meta = {}, character = {} }

---@alias BridgeChange 'loaded'|'unloaded'|'money'|'job'|'gang'|'meta'|'character'

---@param kind BridgeChange
---@param fn fun(source: integer, ...)
function Bridge.on(kind, fn)
    listeners[kind][#listeners[kind] + 1] = fn
end

---@param kind BridgeChange
local function emitChange(kind, source, ...)
    for i = 1, #listeners[kind] do
        local ok, err = pcall(listeners[kind][i], source, ...)
        if not ok then print(('^1[ai-core bridge] %s handler failed: %s^0'):format(kind, err)) end
    end
end
Bridge.emit = emitChange

---@param citizenid string
---@return integer|nil
function Bridge.sourceByCitizenId(citizenid)
    return byCitizen[citizenid]
end

--- The on-duty sources of a job (a live set: do not change it).
---@param job string
---@return table<integer, true>
function Bridge.onDutyIn(job)
    return onDuty[job] or {}
end

---@param job string|nil
---@param source integer
---@param on boolean
local function setOnDuty(job, source, on)
    if not job then return end
    local set = onDuty[job]
    if on then
        if not set then set = {} onDuty[job] = set end
        set[source] = true
    elseif set then
        set[source] = nil
        if next(set) == nil then onDuty[job] = nil end
    end
end
Bridge.setOnDuty = setOnDuty

--- ai-core changed a loaded character's name, birth date, nationality or sex (`SetCharacterInfo` answered ok): the
--- mirror takes the values and the framework parts hear 'character'.
---@param source integer
---@param patch table<string, string>
function Bridge.characterChanged(source, patch)
    local mirror = Bridge.players[source]
    if not mirror then return end
    for key, value in pairs(patch) do mirror.character[key] = value end
    emitChange('character', source)
end

---@param source integer
local function load(source)
    local data = core:GetPlayerData(source)
    if not data or not data.character then return end
    Bridge.players[source] = {
        source = source,
        character = data.character,
        money = data.money or {},
        jobs = data.jobs or {},
        duty = data.duty,
        job = data.job or { job = 'unemployed', grade = 0 },
        gangs = data.gangs or {},
        activeGang = data.activeGang,
        metadata = data.metadata or {},
    }
    byCitizen[data.character.citizenid] = source
    setOnDuty(data.duty, source, true)
    -- The client part builds everything else from ai-core's own player data channel; only the license is extra.
    TriggerClientEvent('ai-core:bridge:license', source, Bridge.license(source))
    emitChange('loaded', source)
end

AddEventHandler('ai-core:playerLoaded', function(source)
    load(source)
end)

AddEventHandler('ai-core:playerUnloaded', function(source, _, reason)
    local mirror = Bridge.players[source]
    if not mirror then return end
    emitChange('unloaded', source, reason)
    byCitizen[mirror.character.citizenid] = nil
    setOnDuty(mirror.duty, source, false)
    Bridge.players[source] = nil
end)

--- A restart of ai-core (or a late bridge) mirrors the players already loaded.
CreateThread(function()
    Wait(1000)
    for _, source in ipairs(core:GetLoadedSources() or {}) do
        if not Bridge.players[source] then load(source) end
    end
end)
