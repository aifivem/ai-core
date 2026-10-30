-- ai-core's framework bridge, server side: the shared mirror the ESX, QB and Qbox parts read.
-- No game logic lives here: every change goes to ai-core (same resource, JS side) and the mirror follows ai-core's
-- local delta events.

local core = exports['ai-core']

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

---@class AiGrade
---@field label string
---@field salary number
---@field boss boolean

---@class AiJobDefinition
---@field label string
---@field type string
---@field defaultDuty boolean
---@field grades AiGrade[]

---@class BridgeMirror
---@field source integer
---@field character AiCharacter
---@field money table<string, number>
---@field jobs AiJobMembership[]
---@field duty string|nil
---@field gangs AiGangMembership[]
---@field activeGang string|nil

---@class BridgeJob
---@field name string
---@field label string
---@field type string
---@field grade integer
---@field gradeLabel string
---@field salary number
---@field boss boolean
---@field onDuty boolean

Bridge = {}

---@type table<integer, BridgeMirror>
Bridge.players = {}

--- Calls `fn(...)` for every part (ESX, QB) that wants to hear a player change.
---@type table<string, fun(source: integer, ...)[]>
local listeners = { loaded = {}, unloaded = {}, money = {}, job = {}, gang = {} }

---@param kind 'loaded'|'unloaded'|'money'|'job'|'gang'
---@param fn fun(source: integer, ...)
function Bridge.on(kind, fn)
    listeners[kind][#listeners[kind] + 1] = fn
end

---@param kind 'loaded'|'unloaded'|'money'|'job'|'gang'
local function emitChange(kind, source, ...)
    for i = 1, #listeners[kind] do
        local ok, err = pcall(listeners[kind][i], source, ...)
        if not ok then print(('^1[ai-core bridge] %s handler failed: %s^0'):format(kind, err)) end
    end
end

--- Answers `exports[name]:export(...)` for a name ai-core provides (exports are not aliased by `provide`).
---@param name string
---@param export string
---@param fn function
function Bridge.provideExport(name, export, fn)
    AddEventHandler(('__cfx_export_%s_%s'):format(name, export), function(setCB)
        setCB(fn)
    end)
end

--- ai-core's job definitions (panel content), read when asked: definitions change rarely and only from the panel.
---@return table<string, AiJobDefinition>
function Bridge.jobDefinitions()
    return core:GetJobDefinitions() or {}
end

---@return table<string, { label: string, grades: AiGrade[] }>
function Bridge.gangDefinitions()
    return core:GetGangDefinitions() or {}
end

--- The job a framework script sees: the on-duty job, else the first membership, else unemployed.
---@param mirror BridgeMirror
---@return BridgeJob
function Bridge.jobOf(mirror)
    local pick
    for i = 1, #mirror.jobs do
        if mirror.jobs[i].job == mirror.duty then pick = mirror.jobs[i] break end
    end
    pick = pick or mirror.jobs[1] or { job = 'unemployed', grade = 0 }
    local definition = Bridge.jobDefinitions()[pick.job]
    local grade = definition and definition.grades[pick.grade + 1] or { label = 'Freelancer', salary = 0, boss = false }
    return {
        name = pick.job,
        label = definition and definition.label or pick.job,
        type = definition and definition.type or 'none',
        grade = pick.grade,
        gradeLabel = grade.label,
        salary = grade.salary,
        boss = grade.boss,
        onDuty = mirror.duty == pick.job,
    }
end

--- The active gang, else none.
---@param mirror BridgeMirror
---@return { name: string, label: string, grade: integer, gradeLabel: string, boss: boolean }
function Bridge.gangOf(mirror)
    local pick
    for i = 1, #mirror.gangs do
        if mirror.gangs[i].gang == mirror.activeGang then pick = mirror.gangs[i] break end
    end
    if not pick then return { name = 'none', label = 'No Gang', grade = 0, gradeLabel = 'None', boss = false } end
    local definition = Bridge.gangDefinitions()[pick.gang]
    local grade = definition and definition.grades[pick.grade + 1] or { label = 'Member', boss = false }
    return { name = pick.gang, label = definition and definition.label or pick.gang, grade = pick.grade, gradeLabel = grade.label, boss = grade.boss }
end

---@param citizenid string
---@return integer|nil
function Bridge.sourceByCitizenId(citizenid)
    for source, mirror in pairs(Bridge.players) do
        if mirror.character.citizenid == citizenid then return source end
    end
end

---@param source integer
---@return string|nil
function Bridge.license(source)
    return GetPlayerIdentifierByType(tostring(source), 'license')
end

---@param source integer
---@return boolean
function Bridge.isAdmin(source)
    return IsPlayerAceAllowed(tostring(source), 'ai.admin') == true or IsPlayerAceAllowed(tostring(source), 'ai.admin') == 1
end

local kinds = { primary = 'info', inform = 'info', info = 'info', success = 'success', error = 'error', warning = 'warning' }

--- A notification card through ai-core (QB / ESX notify types mapped to ai-core's kinds).
---@param source integer
---@param text string
---@param kind? string
---@param duration? integer
function Bridge.notify(source, text, kind, duration)
    if type(text) == 'table' then text = text.text or text.caption or '' end
    TriggerClientEvent('ai-core:client:notify', source, { text = tostring(text), kind = kinds[kind or 'info'] or 'info', duration = duration })
end

--- The bridge's own channel to the client part: a snapshot at load, then patches (job, gang, money, metadata).
---@param source integer
---@param part string
---@param value any
function Bridge.patch(source, part, value)
    TriggerClientEvent('ai-core:bridge:patch', source, part, value)
end

---@param source integer
local function snapshot(source)
    local mirror = Bridge.players[source]
    if not mirror then return end
    TriggerClientEvent('ai-core:bridge:snapshot', source, {
        character = mirror.character,
        money = mirror.money,
        job = Bridge.jobOf(mirror),
        gang = Bridge.gangOf(mirror),
        license = Bridge.license(source),
        name = GetPlayerName(tostring(source)),
    })
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
        gangs = data.gangs or {},
        activeGang = data.activeGang,
    }
    snapshot(source)
    emitChange('loaded', source)
end

AddEventHandler('ai-core:playerLoaded', function(source)
    load(source)
end)

AddEventHandler('ai-core:playerUnloaded', function(source, _, reason)
    if not Bridge.players[source] then return end
    emitChange('unloaded', source, reason)
    Bridge.players[source] = nil
end)

AddEventHandler('ai-core:moneyChanged', function(source, account, balance, delta, reason)
    local mirror = Bridge.players[source]
    if not mirror then return end
    mirror.money[account] = balance
    Bridge.patch(source, 'money', { [account] = balance })
    emitChange('money', source, account, balance, delta, reason)
end)

---@param source integer
local function jobChanged(source)
    local mirror = Bridge.players[source]
    if not mirror then return end
    local job = Bridge.jobOf(mirror)
    Bridge.patch(source, 'job', job)
    emitChange('job', source, job)
end

AddEventHandler('ai-core:jobsChanged', function(source, jobs)
    local mirror = Bridge.players[source]
    if not mirror then return end
    mirror.jobs = jobs or {}
    jobChanged(source)
end)

AddEventHandler('ai-core:dutyChanged', function(source, job)
    local mirror = Bridge.players[source]
    if not mirror then return end
    mirror.duty = job
    jobChanged(source)
end)

---@param source integer
local function gangChanged(source)
    local mirror = Bridge.players[source]
    if not mirror then return end
    local gang = Bridge.gangOf(mirror)
    Bridge.patch(source, 'gang', gang)
    emitChange('gang', source, gang)
end

AddEventHandler('ai-core:gangsChanged', function(source, gangs)
    local mirror = Bridge.players[source]
    if not mirror then return end
    mirror.gangs = gangs or {}
    gangChanged(source)
end)

AddEventHandler('ai-core:activeGangChanged', function(source, gang)
    local mirror = Bridge.players[source]
    if not mirror then return end
    mirror.activeGang = gang
    gangChanged(source)
end)

--- A restart of ai-core (or a late bridge) mirrors the players already loaded.
CreateThread(function()
    Wait(1000)
    for _, source in ipairs(core:GetLoadedSources() or {}) do
        if not Bridge.players[source] then load(source) end
    end
end)

--- Callbacks of both frameworks share one gate: at most 30 requests per player per 10 s.
---@type table<integer, { count: integer, reset: integer }>
local rates = {}

---@param source integer
---@return boolean
function Bridge.allow(source)
    local now = GetGameTimer()
    local rate = rates[source]
    if not rate or now > rate.reset then
        rates[source] = { count = 1, reset = now + 10000 }
        return true
    end
    rate.count = rate.count + 1
    return rate.count <= 30
end

AddEventHandler('playerDropped', function()
    rates[source] = nil
end)

--- ai-core's inventory layer (JS side, `resource/server/inventory`): the active inventory answers every item call,
--- false / 0 / empty while none runs.
Bridge.inventory = function()
    return core
end

--- An item definition from the active inventory in the QB item shape, cached per name.
---@type table<string, table|false>
local itemCache = {}

---@class AiItemDefinition
---@field name string
---@field label string
---@field weight number
---@field unique boolean
---@field close boolean
---@field description string

---@param name string
---@param definition AiItemDefinition
---@return table
local function qbItem(name, definition)
    return {
        name = name,
        label = definition.label,
        weight = definition.weight,
        type = 'item',
        image = ('%s.png'):format(name),
        unique = definition.unique,
        useable = true,
        shouldClose = definition.close,
        description = definition.description,
    }
end

---@param name string
---@return table|nil
function Bridge.itemDefinition(name)
    local cached = itemCache[name]
    if cached ~= nil then return cached or nil end
    local definition = core:GetItemDefinition(name)
    cached = definition and qbItem(name, definition) or false
    itemCache[name] = cached
    return cached or nil
end

--- Every item definition of the active inventory in the QB item shape (one export call; fills the cache).
---@return table<string, table>
function Bridge.itemDefinitions()
    local out = {}
    for name, definition in pairs(core:GetItemDefinitions() or {}) do
        out[name] = qbItem(name, definition)
        itemCache[name] = out[name]
    end
    return out
end

AddEventHandler('ai-core:inventoryChanged', function()
    itemCache = {}
end)

--- Runs the handler registered for an item (ESX `UseItem`, QB / Qbox `CanUseItem`); `...` may hold the item table.
---@param source integer
---@param name string
---@return any
function Bridge.useItem(source, name, ...)
    for i = 1, select('#', ...) do
        local value = select(i, ...)
        if type(value) == 'table' then return core:UseItem(source, name, value) end
    end
    return core:UseItem(source, name)
end

Bridge.core = core
