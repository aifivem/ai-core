-- ai-core's framework bridge, client side: the player's mirror, built from ai-core's own player data channel
-- (snapshot at load, then deltas) and the job / gang definitions ai-core's client keeps, plus ai-core's notify for
-- every framework's notify call. Under an external character screen (`docs/compat/multichar.md`) the mirror loads when
-- ai-core logs the character in (`ai-core:client:externalLoaded`), before that screen spawns the ped; 'spawned' follows
-- once the player stands in the world (`ai-core:client:playerLoaded`).

---@class BridgeClientState
---@field loaded boolean
---@field external boolean the character was loaded by an external character screen (it fires its own load events)
---@field character table|nil
---@field money table<string, number>
---@field job table|nil
---@field gang table|nil
---@field metadata table<string, any>
---@field license string|nil
---@field name string|nil

---@type BridgeClientState
BridgeClient = { loaded = false, external = false, character = nil, money = {}, job = nil, gang = nil, metadata = {}, license = nil, name = nil }

--- 'loaded' (data: AiPlayerData, external: boolean): the character's data is in; 'spawned': it stands in the world.
---@alias BridgeClientChange 'loaded'|'spawned'|'unloaded'|'money'|'job'|'gang'|'meta'

---@type table<string, fun(...)[]>
local listeners = { loaded = {}, spawned = {}, unloaded = {}, money = {}, job = {}, gang = {}, meta = {} }

---@param kind BridgeClientChange
---@param fn fun(...)
function BridgeClient.on(kind, fn)
    listeners[kind][#listeners[kind] + 1] = fn
end

---@param kind BridgeClientChange
local function emitChange(kind, ...)
    for i = 1, #listeners[kind] do
        local ok, err = pcall(listeners[kind][i], ...)
        if not ok then print(('^1[ai-core bridge] %s handler failed: %s^0'):format(kind, err)) end
    end
end

--- Answers `exports[name]:export(...)` for a name ai-core provides.
---@param name string
---@param export string
---@param fn function
function BridgeClient.provideExport(name, export, fn)
    AddEventHandler(('__cfx_export_%s_%s'):format(name, export), function(setCB)
        setCB(fn)
    end)
end

local kinds = { primary = 'info', inform = 'info', info = 'info', success = 'success', error = 'error', warning = 'warning' }

--- Every framework's notify: QB's `{ text, caption }` table shows `text` as the title over `caption`.
---@param text string|{ text?: string, caption?: string }
---@param kind? string
---@param duration? integer
---@param title? string
function BridgeClient.notify(text, kind, duration, title)
    if type(text) == 'table' then
        if text.caption then
            title, text = text.text, text.caption
        else
            text = text.text
        end
    end
    aiLib.notify(tostring(text or ''), kinds[kind or 'info'] or 'info', tonumber(duration), title and tostring(title) or nil)
end

--- The closest ped / object / vehicle to `coords` (default the local ped; peds skip it) that passes `filter`, in ESX's
--- and QB's shape: the entity and its distance, -1, -1 when none.
---@param kind 'ped'|'object'|'vehicle'
---@param coords? vector3|vector4|table
---@param filter? fun(entity: integer): boolean
---@return integer, number
function BridgeClient.closest(kind, coords, filter)
    local entity, distance = aiLib.nearestEntity(kind, coords, nil, { filter = filter })
    if entity == 0 then return -1, -1 end
    return entity, distance --[[@as number]]
end

--- ai-core's values the job and gang views are built from.
---@type { jobs: { job: string, grade: integer }[], duty: string|nil, job: { job: string, grade: integer }|nil, gangs: { gang: string, grade: integer }[], activeGang: string|nil }
local raw = { jobs = {}, duty = nil, job = nil, gangs = {}, activeGang = nil }

--- Every job and gang membership by name with its grade (Qbox's client GetGroups).
---@return table<string, integer>
function BridgeClient.groups()
    local out = {}
    for _, m in ipairs(raw.jobs) do out[m.job] = m.grade end
    for _, m in ipairs(raw.gangs) do out[m.gang] = m.grade end
    return out
end

--- Job and gang definitions from ai-core's client (panel files), read once and kept by its change event.
---@type table<string, table>
local definitions = {}

---@param file 'jobs'|'gangs'
---@return table<string, table>
local function definitionsOf(file)
    local list = definitions[file]
    if not list then
        list = exports['ai-core']:GetDefinitions(file) or {}
        definitions[file] = list
    end
    return list
end

--- The job a framework script sees (ai-core's current job), in the same shape as the server part's `Bridge.jobOf`.
local function jobView()
    local pick = raw.job or { job = 'unemployed', grade = 0 }
    local definition = definitionsOf('jobs')[pick.job]
    local grade = definition and definition.grades and definition.grades[pick.grade + 1]
    return {
        name = pick.job,
        label = definition and definition.label or pick.job,
        type = definition and definition.type or 'none',
        grade = pick.grade,
        gradeLabel = grade and grade.label or 'Freelancer',
        salary = grade and grade.salary or 0,
        boss = grade ~= nil and grade.boss == true,
        onDuty = raw.duty == pick.job,
    }
end

local function gangView()
    local pick
    for i = 1, #raw.gangs do
        if raw.gangs[i].gang == raw.activeGang then pick = raw.gangs[i] break end
    end
    if not pick then return { name = 'none', label = 'No Gang', grade = 0, gradeLabel = 'None', boss = false } end
    local definition = definitionsOf('gangs')[pick.gang]
    local grade = definition and definition.grades and definition.grades[pick.grade + 1]
    return { name = pick.gang, label = definition and definition.label or pick.gang, grade = pick.grade, gradeLabel = grade and grade.label or 'Member', boss = grade ~= nil and grade.boss == true }
end

---@param a table|nil
---@param b table
local function same(a, b)
    if not a then return false end
    for key, value in pairs(b) do
        if a[key] ~= value then return false end
    end
    return true
end

local function refreshJob()
    if not BridgeClient.loaded then return end
    local view = jobView()
    if same(BridgeClient.job, view) then return end
    local last = BridgeClient.job
    BridgeClient.job = view
    emitChange('job', view, last)
end

local function refreshGang()
    if not BridgeClient.loaded then return end
    local view = gangView()
    if same(BridgeClient.gang, view) then return end
    BridgeClient.gang = view
    emitChange('gang', view)
end

AddEventHandler('ai-core:client:definitions', function(file, name, value)
    local list = definitions[file]
    if list then list[name] = value end
    if file == 'jobs' then refreshJob() else refreshGang() end
end)

--- Puts money entries into the mirror (the table keeps its identity: framework PlayerData points at it).
---@param entries table<string, number>
---@param full boolean the whole map (accounts missing from it are gone)
local function putMoney(entries, full)
    local money = BridgeClient.money
    if full then
        for account in pairs(money) do
            if entries[account] == nil then money[account] = nil end
        end
    end
    for account, balance in pairs(entries) do
        if money[account] ~= balance then
            money[account] = balance
            if BridgeClient.loaded then emitChange('money', account, balance) end
        end
    end
end

---@param entries table<string, any>
local function putMeta(entries)
    for key, value in pairs(entries) do
        BridgeClient.metadata[key] = value
        if BridgeClient.loaded then emitChange('meta', key, value) end
    end
end

--- One value of ai-core's player data channel (`AiPlayerData` keys).
---@param key string
---@param value any
---@param patch boolean only the changed entries of a map
local function put(key, value, patch)
    if key == 'character' then BridgeClient.character = value
    elseif key == 'money' and type(value) == 'table' then putMoney(value, not patch)
    elseif key == 'metadata' and type(value) == 'table' then
        if not patch then BridgeClient.metadata = {} end
        putMeta(value)
    elseif key == 'jobs' and type(value) == 'table' then raw.jobs = value
    elseif key == 'duty' then raw.duty = value refreshJob()
    elseif key == 'job' and type(value) == 'table' then raw.job = value refreshJob()
    elseif key == 'gangs' and type(value) == 'table' then raw.gangs = value refreshGang()
    elseif key == 'activeGang' then raw.activeGang = value refreshGang() end
end

RegisterNetEvent('ai-core:client:playerData', function(key, value) put(key, value, false) end)
RegisterNetEvent('ai-core:client:playerDataPatch', function(key, value) put(key, value, true) end)
RegisterNetEvent('ai-core:bridge:license', function(license) BridgeClient.license = license end)

--- Builds the mirror from ai-core's player data and tells the framework parts.
---@param data table ai-core's player data (`AiPlayerData`)
---@param external boolean
local function load(data, external)
    BridgeClient.character = data.character
    putMoney(data.money or {}, true)
    BridgeClient.metadata = data.metadata or {}
    raw.jobs, raw.duty, raw.job = data.jobs or {}, data.duty, data.job
    raw.gangs, raw.activeGang = data.gangs or {}, data.activeGang
    BridgeClient.name = GetPlayerName(PlayerId())
    BridgeClient.job, BridgeClient.gang = jobView(), gangView()
    BridgeClient.external = external
    BridgeClient.loaded = true
    emitChange('loaded', data, external)
end

local function unload()
    if not BridgeClient.loaded then return end
    BridgeClient.loaded = false
    emitChange('unloaded')
    BridgeClient.external = false
    BridgeClient.character, BridgeClient.job, BridgeClient.gang = nil, nil, nil
    BridgeClient.metadata = {}
    for account in pairs(BridgeClient.money) do BridgeClient.money[account] = nil end
end

-- An external character screen logged the character in: its snapshot already came on the player data channel (sent
-- before this event); the screen spawns the ped and fires its own load events, so the mirror loads now.
RegisterNetEvent('ai-core:client:externalLoaded', function()
    if BridgeClient.loaded or not BridgeClient.character then return end
    load({
        character = BridgeClient.character,
        money = BridgeClient.money,
        metadata = BridgeClient.metadata,
        jobs = raw.jobs,
        duty = raw.duty,
        job = raw.job,
        gangs = raw.gangs,
        activeGang = raw.activeGang,
    }, true)
end)

-- The character stands in the world: ai-core hands the whole player data (the snapshot its channel built).
AddEventHandler('ai-core:client:playerLoaded', function(data)
    if type(data) ~= 'table' then return end
    if not (BridgeClient.loaded and BridgeClient.external) then load(data, false) end
    emitChange('spawned')
end)

AddEventHandler('ai-core:client:playerUnloaded', unload)
-- Let go before ai-core's client saw the player in the world (still in the external screen's spawn selector).
RegisterNetEvent('ai-core:client:externalLogout', unload)

-- Framework notify events other scripts send to this client.
RegisterNetEvent('QBCore:Notify', function(text, kind, length) BridgeClient.notify(text, kind, length) end)
RegisterNetEvent('esx:showNotification', function(text, kind, length, title) BridgeClient.notify(text, kind, length, title) end)

--- Callback requests of both frameworks: request id -> the caller's function.
---@type table<string, function>
local pending = {}
local nextId = 0

---@param name string
---@param cb function
function BridgeClient.qbCallback(name, cb, ...)
    pending['qb:' .. name] = cb
    TriggerServerEvent('QBCore:Server:TriggerCallback', name, ...)
end

RegisterNetEvent('QBCore:Client:TriggerCallback', function(name, ...)
    local cb = pending['qb:' .. tostring(name)]
    pending['qb:' .. tostring(name)] = nil
    if cb then cb(...) end
end)

---@param name string
---@param cb function
function BridgeClient.esxCallback(name, cb, ...)
    nextId = nextId + 1
    pending['esx:' .. nextId] = cb
    TriggerServerEvent('esx:triggerServerCallback', name, nextId, GetInvokingResource() or 'ai-core', ...)
end

RegisterNetEvent('esx:serverCallback', function(requestId, _, ...)
    local cb = pending['esx:' .. tostring(requestId)]
    pending['esx:' .. tostring(requestId)] = nil
    if cb then cb(...) end
end)
