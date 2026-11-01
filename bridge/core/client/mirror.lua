-- ai-core's framework bridge, client side: the player's mirror, built from ai-core's own player data channel (snapshot
-- at load, then deltas). Under an external character screen (`docs/compat/multichar.md`) the mirror loads when
-- ai-core logs the character in (`ai-core:client:externalLoaded`), before that screen spawns the ped; 'spawned'
-- follows once the player stands in the world (`ai-core:client:playerLoaded`).

local emitChange, raw = BridgeClient.emit, BridgeClient.raw
local jobView, gangView = BridgeClient.jobView, BridgeClient.gangView
local refreshJob, refreshGang = BridgeClient.refreshJob, BridgeClient.refreshGang

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
