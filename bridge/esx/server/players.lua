-- ESX on ai-core, server side: ESX's player lookups (by id, identifier, job) and counts.

local getPlayerFromId = BridgeESX.getPlayerFromId

--- ESX's per-job player count (`ESX.GetNumPlayers('job', name)`, GlobalState `<job>:count`), kept from the bridge's
--- job changes.
---@type table<string, integer>
local jobCount = {}

---@param job string|nil
---@param delta integer
function BridgeESX.countJob(job, delta)
    if not job then return end
    local count = math.max(0, (jobCount[job] or 0) + delta)
    jobCount[job] = count > 0 and count or nil
    GlobalState[('%s:count'):format(job)] = count
end

---@type table<string, integer> license without its prefix -> source of the loaded players
BridgeESX.byLicense = {}
local byLicense = BridgeESX.byLicense
---@type table<integer, string> source -> its key in `byLicense`
BridgeESX.licenseOf = {}

--- The loaded player behind an ESX identifier: the citizenid (`xPlayer.identifier`), or a multichar's
--- `char<slot>:<license>` (the account's character in that slot, while it is the one loaded).
---@param identifier any
---@return integer|nil
local function sourceOfIdentifier(identifier)
    if type(identifier) ~= 'string' then return nil end
    local source = Bridge.sourceByCitizenId(identifier)
    if source then return source end
    local slot, license = identifier:match('^%a*(%d+):(.+)$')
    source = license and byLicense[license]
    local mirror = source and Bridge.players[source]
    return mirror and mirror.character.slot == tonumber(slot) and source or nil
end

---@param identifier string
---@return xPlayer|nil
function ESX.GetPlayerFromIdentifier(identifier)
    local source = sourceOfIdentifier(identifier)
    return source and getPlayerFromId(source) or nil
end

---@return integer[]
function ESX.GetPlayers()
    local out = {}
    for source in pairs(Bridge.players) do out[#out + 1] = source end
    return out
end

---@param x xPlayer
---@param key string
---@param value any
---@return boolean
local function matches(x, key, value)
    return (key == 'job' and x.job.name == value) or x[key] == value
end

--- ESX's filter: no key = every player; `val` a list = a table per value. `minimal` gives server ids.
---@param key? string
---@param val? any
---@param minimal? boolean
---@return xPlayer[]|integer[]|table<any, xPlayer[]|integer[]>
function ESX.GetExtendedPlayers(key, val, minimal)
    local out = {}
    if type(val) == 'table' then
        for _, v in ipairs(val) do out[v] = {} end
    end
    for source in pairs(Bridge.players) do
        local x = getPlayerFromId(source)
        if x then
            local entry = minimal and source or x
            if not key then out[#out + 1] = entry
            elseif type(val) == 'table' then
                for _, v in ipairs(val) do
                    if matches(x, key, v) then out[v][#out[v] + 1] = entry end
                end
            elseif matches(x, key, val) then out[#out + 1] = entry end
        end
    end
    return out
end

--- ESX's static players are the xPlayers here (the same methods).
---@param key? string
---@param val? any
---@return xPlayer[]|table<any, xPlayer[]>
function ESX.ExtendedPlayers(key, val) return ESX.GetExtendedPlayers(key, val) end

---@param key? string
---@param val? any
---@return integer|table<any, integer>
function ESX.GetNumPlayers(key, val)
    if not key then return #GetPlayers() end
    if key == 'job' then
        if type(val) ~= 'table' then return jobCount[val] or 0 end
        local out = {}
        for _, v in ipairs(val) do out[v] = jobCount[v] or 0 end
        return out
    end
    local found = ESX.GetExtendedPlayers(key, val, true)
    if type(val) ~= 'table' then return #found end
    local out = {}
    for v, list in pairs(found) do out[v] = #list end
    return out
end

--- The player's license without its `license:` prefix (ESX's account identifier; xPlayer.identifier is the citizenid).
---@param playerId integer|string
---@return string|nil
function ESX.GetIdentifier(playerId)
    local license = GetPlayerIdentifierByType(tostring(playerId), 'license')
    return license and (license:gsub('^license:', '')) or nil
end

function ESX.GetExtendedPlayerCount() return #ESX.GetPlayers() end

--- The player object by server id or identifier (ESX's static player): the same functions as xPlayer.
---@param source integer|string
---@return xPlayer|nil
function ESX.Player(source)
    if type(source) == 'string' then return ESX.GetPlayerFromIdentifier(source) end
    return getPlayerFromId(source)
end

---@param source integer
---@return boolean
function ESX.IsPlayerLoaded(source) return Bridge.players[tonumber(source)] ~= nil end

---@param identifier string
---@return integer|nil
function ESX.GetPlayerIdFromIdentifier(identifier) return sourceOfIdentifier(identifier) end
