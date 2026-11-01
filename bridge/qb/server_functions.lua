-- QBCore on ai-core, server side, part two: the rest of qb-core's server API (QBCore.Functions lookups, permissions,
-- buckets, vehicles, client callbacks, the Shared registries, QBCore.Player, QBCore.Commands), qb-core's net events and
-- `exports['qb-core']:<every QBCore.Functions name>` as qb-core exports them. Loaded after bridge/qb/server.lua and
-- bridge/qb/server_shared.lua. Behaviour copied from qb-core (https://github.com/qbcore-framework/qb-core, GPL-3.0)
-- where ai-core has no part in it; everything about players forwards to ai-core.

local core = Bridge.core
local getPlayer = BridgeQB.getPlayer

---@param source any
---@return integer|nil
local function playerId(source)
    local id = tonumber(source)
    if not id or math.type(id) ~= 'integer' or id <= 0 then return nil end
    return id --[[@as integer]]
end

---@param result any an ai-core character write's answer
---@return boolean
local function succeeded(result)
    return type(result) == 'table' and result.ok == true
end

local text ---@type fun(key: string, ...: string|number): string

--- Drops a player for an exploit and logs it (QB's character join / delete checks).
---@param id integer
---@param what string
local function exploitDrop(id, what)
    text = text or aiLib.locale('ai-core')
    aiLib.aiLog('anticheat', ('Dropped for %s'):format(what), { level = 'warn', source = id, metadata = { by = GetInvokingResource() } })
    DropPlayer(tostring(id), text('BRIDGE_EXPLOIT_DROPPED'))
end

--- qb-core's / Qbox's anti-cheat ban: a permanent ban in ai-core's ban list with the origin as reason (the player is
--- dropped by it); dropped without a ban only when ai-core refuses the ban.
---@param target integer
---@param origin string
local function exploitBan(target, origin)
    local id = playerId(target)
    if not id or not GetPlayerName(tostring(id)) then return end
    local reason = tostring(origin or 'exploit')
    aiLib.aiLog('anticheat', ('Banned for exploiting: %s'):format(reason), { level = 'warn', source = id, metadata = { by = GetInvokingResource() } })
    if core:BanPlayer(id, reason, nil, 'Anti Cheat') ~= true then
        text = text or aiLib.locale('ai-core')
        DropPlayer(tostring(id), text('BRIDGE_EXPLOIT_DROPPED'))
    end
end
BridgeQB.exploitBan = exploitBan

--------------------------------------------------------------------------------------------------------------------
-- Lookups
--------------------------------------------------------------------------------------------------------------------

---@param entity integer
---@return vector4
function QBCore.Functions.GetCoords(entity)
    local coords = GetEntityCoords(entity)
    return vector4(coords.x, coords.y, coords.z, GetEntityHeading(entity))
end

--- A Player by phone number: the running phone script's owner of that number (ai-core's phone layer), else the number
--- the bridge gave the character while no phone script answers.
---@param number string|integer
---@return QBPlayer|nil
function QBCore.Functions.GetPlayerByPhone(number)
    if number == nil then return nil end
    local source = aiLib.phone.sourceOf(tostring(number)) or BridgeQB.sourceByPhone(tostring(number))
    return source and getPlayer(source) or nil
end

---@param account string
---@return QBPlayer|nil
function QBCore.Functions.GetPlayerByAccount(account)
    local source = BridgeQB.sourceByAccount(account)
    return source and getPlayer(source) or nil
end

--- A loaded Player whose `charinfo[property]` equals `value` (walks the loaded players, like qb-core).
---@param property string
---@param value any
---@return QBPlayer|nil
function QBCore.Functions.GetPlayerByCharInfo(property, value)
    for source, player in pairs(QBCore.Players) do
        local charinfo = player.PlayerData.charinfo
        if charinfo[property] ~= nil and charinfo[property] == value then return getPlayer(source) end
    end
    return nil
end

--- Players of a job (name or job type), optionally only those on duty: on-duty sets come from the mirror's index.
---@param job string
---@param checkOnDuty? boolean
---@return integer[], integer
function QBCore.Functions.GetPlayersByJob(job, checkOnDuty)
    local players = {}
    local definitions = Bridge.jobDefinitions()
    if checkOnDuty then
        for source in pairs(Bridge.onDutyIn(job)) do players[#players + 1] = source end
        for name, definition in pairs(definitions) do
            if name ~= job and definition.type == job then
                for source in pairs(Bridge.onDutyIn(name)) do players[#players + 1] = source end
            end
        end
    else
        for source, mirror in pairs(Bridge.players) do
            local name = mirror.job.job
            if name == job or (definitions[name] and definitions[name].type == job) then players[#players + 1] = source end
        end
    end
    return players, #players
end

---@param job string
---@return integer[], integer
function QBCore.Functions.GetPlayersOnDuty(job)
    return QBCore.Functions.GetPlayersByJob(job, true)
end

---@param job string
---@return integer
function QBCore.Functions.GetDutyCount(job)
    local _, count = QBCore.Functions.GetPlayersByJob(job, true)
    return count
end

---@param coords any
---@return vector3|nil
local function vec3(coords)
    local kind = type(coords)
    if coords == nil or kind == 'number' or kind == 'string' or kind == 'boolean' or kind == 'function' then return nil end
    local x, y, z = tonumber(coords.x), tonumber(coords.y), tonumber(coords.z)
    if not x or not y or not z then return nil end
    return vector3(x, y, z)
end

--- The closest entity of a list to a point (`skip` left out); -1, -1 when none.
---@param list integer[]
---@param origin vector3
---@param skip? integer
---@return integer, number
local function closestOf(list, origin, skip)
    local best, bestDist = -1, -1
    for i = 1, #list do
        local entity = list[i]
        if entity ~= skip then
            local d = #(GetEntityCoords(entity) - origin)
            if bestDist == -1 or d < bestDist then best, bestDist = entity, d end
        end
    end
    return best, bestDist
end

--- The closest other player to a player (ai-lib `nearestPlayerTo`: players in its OneSync scope) or to `coords`
--- (ai-lib `playersNearCoords`: loaded players).
---@param source integer
---@param coords? vector3|table
---@return integer closestPlayer, number closestDistance
function QBCore.Functions.GetClosestPlayer(source, coords)
    local origin = vec3(coords)
    if not origin then
        local other = aiLib.nearestPlayerTo(source, 500.0)
        if not other then return -1, -1 end
        return other, #(GetEntityCoords(GetPlayerPed(other)) - GetEntityCoords(GetPlayerPed(source)))
    end
    local best, bestDist = -1, -1
    for _, id in ipairs(aiLib.playersNearCoords(origin, math.huge)) do
        if id ~= source then
            local d = #(GetEntityCoords(GetPlayerPed(id)) - origin)
            if bestDist == -1 or d < bestDist then best, bestDist = id, d end
        end
    end
    return best, bestDist
end

--- The closest vehicle to a player (ai-lib `nearestVehicleTo`) or to `coords`.
---@param source integer
---@param coords? vector3|table
---@return integer closestVehicle, number closestDistance
function QBCore.Functions.GetClosestVehicle(source, coords)
    local origin = vec3(coords)
    if not origin then
        local vehicle = aiLib.nearestVehicleTo(source, math.huge)
        if vehicle == 0 then return -1, -1 end
        return vehicle, #(GetEntityCoords(vehicle) - GetEntityCoords(GetPlayerPed(source)))
    end
    return closestOf(GetAllVehicles() --[[@as integer[] ]], origin)
end

---@param source integer
---@param coords? vector3|table
---@return integer closestObject, number closestDistance
function QBCore.Functions.GetClosestObject(source, coords)
    return closestOf(GetAllObjects() --[[@as integer[] ]], vec3(coords) or GetEntityCoords(GetPlayerPed(source)))
end

---@param source integer
---@param coords? vector3|table
---@return integer closestPed, number closestDistance
function QBCore.Functions.GetClosestPed(source, coords)
    local own = GetPlayerPed(source)
    return closestOf(GetAllPeds() --[[@as integer[] ]], vec3(coords) or GetEntityCoords(own), own)
end

--------------------------------------------------------------------------------------------------------------------
-- QBCore.Player: offline characters (ai-core reads and writes stored characters), login, logout, save and delete
--------------------------------------------------------------------------------------------------------------------

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

--- A Player object for a stored character that is not loaded: money, job, gang, metadata and charinfo changes are
--- written through ai-core's offline character exports (each waits for its answer: call from a thread); items are
--- refused (an inventory belongs to a loaded player).
---@param character AiOfflineCharacter
---@return QBPlayer
local function offlinePlayer(character)
    local charId = character.info.id
    local data = offlineData(character)
    local player = { PlayerData = data, Offline = true } --[[@as QBPlayer]]

    ---@param key string
    ---@param value any
    ---@return boolean
    local function setMeta(key, value)
        if not succeeded(Bridge.await('SetOfflineMeta', charId, key, value)) then return false end
        character.metadata[key] = value
        if key ~= CHARINFO_KEY then
            if value == nil then value = copy(BridgeQB.metaDefaults[key]) end
            data.metadata[key] = value
        end
        return true
    end

    ---@param name string
    ---@return table
    local function metaTable(name)
        local value = character.metadata[name]
        if type(value) == 'table' then return copy(value) end
        return copy(BridgeQB.metaDefaults[name]) or {}
    end

    ---@param kind 'Add'|'Remove'|'Set'
    ---@return fun(moneytype: string, amount: number, reason?: string): boolean
    local function money(kind)
        return function(moneytype, amount, reason)
            local value = tonumber(amount)
            if type(moneytype) ~= 'string' or not value then return false end
            local account = moneytype:lower()
            local balance = data.money[account]
            if balance == nil then return false end
            if not succeeded(Bridge.await(kind .. 'OfflineMoney', charId, account, value, reason)) then return false end
            data.money[account] = kind == 'Add' and balance + value or kind == 'Remove' and balance - value or value
            character.money[account] = data.money[account]
            return true
        end
    end

    local function refuse() return false end
    local function nothing() end
    local functions
    functions = {
        GetPlayerData = function() return data end,
        UpdateClient = nothing,
        UpdatePlayerData = nothing,
        AddMoney = money('Add'),
        RemoveMoney = money('Remove'),
        SetMoney = money('Set'),
        GetMoney = function(moneytype)
            if type(moneytype) ~= 'string' then return false end
            local amount = data.money[moneytype:lower()]
            return amount ~= nil and amount or false
        end,
        SetJob = function(job, grade)
            if type(job) ~= 'string' then return false end
            job, grade = job:lower(), math.tointeger(tonumber(grade)) or 0
            if not succeeded(Bridge.await('SetOfflineJob', charId, job, grade)) then return false end
            local held = false
            for _, m in ipairs(character.jobs) do
                if m.job == job then m.grade, held = grade, true end
            end
            if not held then character.jobs[#character.jobs + 1] = { job = job, grade = grade } end
            data.job = jobView({ job = job, grade = grade })
            return true
        end,
        -- Duty is runtime state of a loaded character.
        SetJobDuty = nothing,
        SetGang = function(gang, grade)
            if type(gang) ~= 'string' then return false end
            gang, grade = gang:lower(), math.tointeger(tonumber(grade)) or 0
            if not succeeded(Bridge.await('SetOfflineGang', charId, gang, grade)) then return false end
            local held = false
            for _, m in ipairs(character.gangs) do
                if m.gang == gang then m.grade, held = grade, true end
            end
            if not held then character.gangs[#character.gangs + 1] = { gang = gang, grade = grade } end
            character.activeGang = character.activeGang or gang
            data.gang = gangView({ { gang = gang, grade = grade } }, gang)
            return true
        end,
        SetMetaData = function(key, value)
            if type(key) ~= 'string' or key == CHARINFO_KEY then return end
            if (key == 'hunger' or key == 'thirst') and type(value) == 'number' then value = math.min(100, math.max(0, value)) end
            setMeta(key, value)
        end,
        GetMetaData = function(key)
            if type(key) ~= 'string' or key == CHARINFO_KEY then return end
            return data.metadata[key]
        end,
        AddRep = function(rep, amount)
            local add = tonumber(amount)
            if type(rep) ~= 'string' or not add then return end
            local reps = metaTable('rep')
            reps[rep] = (tonumber(reps[rep]) or 0) + add
            setMeta('rep', reps)
        end,
        RemoveRep = function(rep, amount)
            local remove = tonumber(amount)
            if type(rep) ~= 'string' or not remove then return end
            local reps = metaTable('rep')
            reps[rep] = math.max(0, (tonumber(reps[rep]) or 0) - remove)
            setMeta('rep', reps)
        end,
        GetRep = function(rep)
            if type(rep) ~= 'string' then return end
            return tonumber(metaTable('rep')[rep]) or 0
        end,
        AddJobReputation = function(amount)
            local add = tonumber(amount)
            if not add then return end
            local reps = metaTable('jobrep')
            reps[data.job.name] = (tonumber(reps[data.job.name]) or 0) + add
            setMeta('jobrep', reps)
        end,
        AddItem = refuse,
        RemoveItem = refuse,
        GetItemByName = nothing,
        GetItemsByName = function() return {} end,
        GetItemBySlot = nothing,
        HasItem = refuse,
        ClearInventory = nothing,
        SetInventory = refuse,
        SetCreditCard = function(cardNumber)
            local values = metaTable(CHARINFO_KEY)
            values.card = cardNumber
            if setMeta(CHARINFO_KEY, values) then data.charinfo.card = cardNumber end
        end,
        GetCardSlot = nothing,
        GetName = function() return ('%s %s'):format(data.charinfo.firstname, data.charinfo.lastname) end,
        Notify = nothing,
        -- Every change above is written as it happens.
        Save = nothing,
        Logout = nothing,
    }
    functions.SetPlayerData = function(key, value)
        if type(key) ~= 'string' or OWNED[key] then return end
        if key == 'metadata' then
            if type(value) ~= 'table' then return end
            for k, v in pairs(value) do
                if type(k) == 'string' and k ~= CHARINFO_KEY and (type(v) == 'table' or character.metadata[k] ~= v) then setMeta(k, v) end
            end
        elseif key == 'job' then
            if type(value) == 'table' and type(value.name) == 'string' then functions.SetJob(value.name, type(value.grade) == 'table' and value.grade.level or 0) end
        elseif key == 'gang' then
            if type(value) == 'table' and type(value.name) == 'string' then functions.SetGang(value.name, type(value.grade) == 'table' and value.grade.level or 0) end
        elseif key == 'charinfo' then
            if type(value) ~= 'table' then return end
            local patch = BridgeQB.charinfoPatch(value, data.charinfo, false)
            if patch and succeeded(Bridge.await('SetCharacterInfo', charId, patch)) then
                BridgeQB.applyCharinfo(data.charinfo, patch)
                data.name = ('%s %s'):format(data.charinfo.firstname, data.charinfo.lastname)
            end
            local values, changed = metaTable(CHARINFO_KEY), false
            for _, field in ipairs({ 'account', 'card' }) do
                if value[field] ~= nil and value[field] ~= values[field] then values[field], changed = value[field], true end
            end
            if changed and setMeta(CHARINFO_KEY, values) then
                data.charinfo.account, data.charinfo.card = values.account or data.charinfo.account, values.card
            end
        else
            -- Fields ai-core has no column for stay on this object.
            data[key] = value
        end
    end
    player.Functions = functions --[[@as QBPlayerFunctions]]
    BridgeQB.addExtensions(player, player.Functions)
    offlineCharacters[player] = character
    return player
end

--- A Player object for PlayerData of no stored character (a script's own `CreatePlayer`): reads work, changes stay on
--- this object, money and items answer false.
---@param data table QB PlayerData
---@return QBPlayer
local function detachedPlayer(data)
    local player = { PlayerData = data, Offline = true } --[[@as QBPlayer]]
    local function refuse() return false end
    local function nothing() end
    local functions = {
        GetPlayerData = function() return data end,
        UpdateClient = nothing,
        UpdatePlayerData = nothing,
        AddMoney = refuse,
        RemoveMoney = refuse,
        SetMoney = refuse,
        GetMoney = function(moneytype)
            if type(moneytype) ~= 'string' then return false end
            return data.money[moneytype:lower()]
        end,
        SetJob = refuse,
        SetGang = refuse,
        SetJobDuty = nothing,
        SetPlayerData = function(key, value)
            if type(key) == 'string' then data[key] = value end
        end,
        SetMetaData = function(key, value)
            if type(key) == 'string' then data.metadata[key] = value end
        end,
        GetMetaData = function(key)
            if type(key) == 'string' then return data.metadata[key] end
        end,
        AddRep = nothing,
        RemoveRep = nothing,
        GetRep = function(rep)
            if type(rep) ~= 'string' then return end
            return type(data.metadata.rep) == 'table' and data.metadata.rep[rep] or 0
        end,
        AddJobReputation = nothing,
        AddItem = refuse,
        RemoveItem = refuse,
        GetItemByName = nothing,
        GetItemsByName = function() return {} end,
        GetItemBySlot = nothing,
        HasItem = refuse,
        ClearInventory = nothing,
        SetInventory = refuse,
        SetCreditCard = function(cardNumber) data.charinfo.card = cardNumber end,
        GetCardSlot = nothing,
        GetName = function() return ('%s %s'):format(data.charinfo.firstname, data.charinfo.lastname) end,
        Notify = nothing,
        Save = nothing,
        Logout = nothing,
    }
    player.Functions = functions --[[@as QBPlayerFunctions]]
    BridgeQB.addExtensions(player, player.Functions)
    return player
end

--- A character by citizenid: the loaded Player, else an offline Player built from ai-core's `GetOfflineCharacter`
--- (ai-core's citizenid is the character's id). Waits: call from a thread.
---@param citizenid string|integer
---@return QBPlayer|nil
local function getOfflinePlayer(citizenid)
    if citizenid == nil then return nil end
    citizenid = tostring(citizenid)
    local online = BridgeQB.getPlayerByCitizenId(citizenid)
    if online then return online end
    local charId = Bridge.charIdOf(citizenid)
    if not charId then return nil end
    local character = Bridge.await('GetOfflineCharacter', charId)
    if type(character) ~= 'table' or tostring(character.info.citizenid) ~= citizenid then return nil end
    -- Loaded while ai-core read it: the live Player.
    local loaded = character.source and getPlayer(character.source)
    if loaded then return loaded end
    return offlinePlayer(character)
end

BridgeQB.getOfflinePlayer = getOfflinePlayer
--- The stored character an offline Player of `getOfflinePlayer` was built from.
---@param player table
---@return AiOfflineCharacter|nil
BridgeQB.offlineCharacter = function(player) return offlineCharacters[player] end
QBCore.Player.GetOfflinePlayer = getOfflinePlayer
QBCore.Functions.GetOfflinePlayerByCitizenId = getOfflinePlayer

--- Every holder of a job or gang, loaded or not (ai-core's paged members, 500 a page; QB's / Qbox's member lists).
--- Waits.
---@param kind 'job'|'gang'
---@param name string
---@return { citizenid: string, grade: integer, source: integer|nil }[]
local function groupMembers(kind, name)
    local out = {}
    if type(name) ~= 'string' then return out end
    local export = kind == 'gang' and 'GetGangMembers' or 'GetJobMembers'
    local after
    repeat
        local answer = promise.new()
        core[export](core, name, function(page) answer:resolve(page) end, after, 500)
        local page = Citizen.Await(answer)
        if type(page) ~= 'table' then break end
        for _, member in ipairs(page.members or {}) do
            out[#out + 1] = { citizenid = member.citizenid, grade = member.grade, source = member.source }
        end
        after = page.next
    until after == nil
    return out
end
BridgeQB.groupMembers = groupMembers

--- qb-core's login from a character screen: a stored character of the player's own account by citizenid, or a new
--- one from `newData` (`cid` = slot, `charinfo` names, birth date, gender 0 / 1, nationality). Waits; true once the
--- character is loaded.
---@param source integer
---@param citizenid? string|false
---@param newData? { cid?: integer, charinfo?: table }
---@return boolean
function QBCore.Player.Login(source, citizenid, newData)
    local id = Bridge.loginSource(source)
    if not id then return false end
    if citizenid then return Bridge.login(id, { citizenid = tostring(citizenid) }) end
    if type(newData) ~= 'table' or type(newData.charinfo) ~= 'table' then return false end
    local ci = newData.charinfo
    return Bridge.createCharacter(id, {
        firstname = tostring(ci.firstname or ''),
        lastname = tostring(ci.lastname or ''),
        birthdate = Bridge.isoDate(ci.birthdate) or '',
        sex = Bridge.sexOf(ci.gender),
        nationality = type(ci.nationality) == 'string' and ci.nationality ~= '' and ci.nationality or nil,
        slot = math.tointeger(tonumber(newData.cid)),
        height = tonumber(ci.height),
    })
end

--- Lets go of the character (saved; the character screen shows again).
---@param source integer
function QBCore.Player.Logout(source)
    local id = playerId(source)
    if id and Bridge.players[id] then Bridge.logout(id) end
end

---@param license string
---@return QBPlayer|nil
function QBCore.Player.GetPlayerByLicense(license)
    if type(license) ~= 'string' then return nil end
    local source = QBCore.Functions.GetSource(license)
    return source ~= 0 and getPlayer(source) or nil
end

--- The first character (by slot) of the account with that license, loaded or not (ai-core `GetCharactersOfUser`).
--- Waits.
---@param license string
---@return QBPlayer|nil
function QBCore.Player.GetOfflinePlayerByLicense(license)
    if type(license) ~= 'string' or license == '' then return nil end
    local characters = Bridge.await('GetCharactersOfUser', license)
    local first = type(characters) == 'table' and characters[1] or nil
    return first and getOfflinePlayer(first.citizenid) or nil
end

QBCore.Functions.GetPlayerByLicense = QBCore.Player.GetPlayerByLicense

--- A loaded player is ai-core's Player; PlayerData of a stored character becomes its offline Player (waits); anything
--- else a detached Player object (never stored).
---@param PlayerData table
---@param Offline? boolean
---@return QBPlayer|nil
function QBCore.Player.CreatePlayer(PlayerData, Offline)
    if type(PlayerData) ~= 'table' then return nil end
    local source = playerId(PlayerData.source)
    if not Offline and source and Bridge.players[source] then return getPlayer(source) end
    local stored = Bridge.charIdOf(PlayerData.citizenid) and getOfflinePlayer(PlayerData.citizenid) or nil
    return stored or detachedPlayer(PlayerData)
end

---@param source? integer
---@param PlayerData? table
---@return QBPlayer|nil
function QBCore.Player.CheckPlayerData(source, PlayerData)
    local id = playerId(source)
    if id and Bridge.players[id] then return getPlayer(id) end
    PlayerData = type(PlayerData) == 'table' and PlayerData or {}
    applyDefaults(PlayerData, QBCore.Config.Player.PlayerDefaults, true)
    return QBCore.Player.CreatePlayer(PlayerData, true)
end

--- ai-core writes money and memberships as they change; this writes position and metadata now (ai-core `SavePlayer`).
---@param source integer
function QBCore.Player.Save(source)
    local player = getPlayer(source)
    if player then player.Functions.Save() end
end

--- Changes on an offline Player are written as they happen.
function QBCore.Player.SaveOffline() end

--- ai-core's soft delete (refused while the character is loaded); prints the refusal.
---@param charId integer
---@param by integer|string
---@return boolean
local function deleteCharacter(charId, by)
    local result = Bridge.await('DeleteCharacter', charId, by)
    if succeeded(result) then return true end
    print(('^3[ai-core bridge] deleting character %d refused: %s^0'):format(charId, type(result) == 'table' and tostring(result.error) or 'no answer'))
    return false
end

--- A character of the player's own account (a character screen's delete). Another account's citizenid drops the
--- player, as qb-core does. Waits.
---@param source integer
---@param citizenid string
---@return boolean
function QBCore.Player.DeleteCharacter(source, citizenid)
    local id, charId = playerId(source), Bridge.charIdOf(citizenid)
    if not id or not charId or not Bridge.allow(id) then return false end
    local info = Bridge.await('GetCharacterInfo', charId)
    if type(info) ~= 'table' then return false end
    if info.userId ~= core:GetUserId(id) then
        exploitDrop(id, ('a character deletion exploit (%s)'):format(tostring(citizenid)))
        return false
    end
    return deleteCharacter(charId, id)
end

--- An admin's delete: a loaded character's player is dropped first, then the character is deleted (in a thread).
---@param citizenid string
function QBCore.Player.ForceDeleteCharacter(citizenid)
    local charId = Bridge.charIdOf(citizenid)
    if not charId then return end
    local by = GetInvokingResource() or 'ai-core'
    CreateThread(function()
        local key = tostring(citizenid)
        local source = Bridge.sourceByCitizenId(key)
        if source then
            DropPlayer(tostring(source), 'An admin deleted the character which you are currently using')
            if not aiLib.waitFor(function() return Bridge.sourceByCitizenId(key) == nil or nil end, 15000) then return end
        end
        deleteCharacter(charId, by)
    end)
end

---@param ids integer|integer[]
---@param fn fun(player: QBPlayer)
local function forEachPlayer(ids, fn)
    if type(ids) == 'number' then
        if ids == -1 then
            for _, player in pairs(QBCore.Players) do fn(player) end
        elseif QBCore.Players[ids] then
            fn(QBCore.Players[ids])
        end
    elseif type(ids) == 'table' then
        for i = 1, #ids do forEachPlayer(ids[i], fn) end
    end
end

---@param ids integer|integer[] a source, a list of them or -1 (every loaded player)
---@param methodName string
---@param handler function
function QBCore.Functions.AddPlayerMethod(ids, methodName, handler)
    forEachPlayer(ids, function(player) player.Functions.AddMethod(methodName, handler) end)
end

---@param ids integer|integer[]
---@param fieldName string
---@param data any
function QBCore.Functions.AddPlayerField(ids, fieldName, data)
    forEachPlayer(ids, function(player) player.Functions.AddField(fieldName, data) end)
end

--------------------------------------------------------------------------------------------------------------------
-- Routing buckets (qb-core's bookkeeping; the numbers are the script's own)
--------------------------------------------------------------------------------------------------------------------

--- ai-core's bucket allocator hands out ids from 1000 up: a QB script that picks such a number itself may share it.
local warnedBucket = {}

---@param bucket integer
local function warnBucket(bucket)
    local resource = GetInvokingResource() or '?'
    if bucket < 1000 or warnedBucket[resource] then return end
    warnedBucket[resource] = true
    print(('^3[ai-core bridge] %s puts players or entities in routing bucket %d: ids from 1000 up are handed out by ai-core\'s bucket allocator (exports["ai-core"]:AcquireBucket), so this one may already be in use^0'):format(resource, bucket))
end

---@return table<string, { id: integer, bucket: integer }>, table<integer, { id: integer, bucket: integer }>
function QBCore.Functions.GetBucketObjects()
    return QBCore.Player_Buckets, QBCore.Entity_Buckets
end

---@param source integer
---@param bucket integer
---@return boolean
function QBCore.Functions.SetPlayerBucket(source, bucket)
    local id, number = playerId(source), tonumber(bucket)
    if not id or not number or math.type(number) ~= 'integer' or number < 0 then return false end
    ---@cast number integer
    warnBucket(number)
    Player(id).state:set('instance', number, true)
    SetPlayerRoutingBucket(tostring(id), number)
    local license = Bridge.license(id)
    if license then QBCore.Player_Buckets[license] = { id = id, bucket = number } end
    return true
end

---@param entity integer
---@param bucket integer
---@return boolean
function QBCore.Functions.SetEntityBucket(entity, bucket)
    local number = tonumber(bucket)
    if type(entity) ~= 'number' or not number or math.type(number) ~= 'integer' or number < 0 or not DoesEntityExist(entity) then return false end
    ---@cast number integer
    warnBucket(number)
    SetEntityRoutingBucket(entity, number)
    QBCore.Entity_Buckets[entity] = { id = entity, bucket = number }
    return true
end

---@param bucket integer
---@return integer[]
function QBCore.Functions.GetPlayersInBucket(bucket)
    local out = {}
    for _, entry in pairs(QBCore.Player_Buckets) do
        if entry.bucket == bucket then out[#out + 1] = entry.id end
    end
    return out
end

---@param bucket integer
---@return integer[]
function QBCore.Functions.GetEntitiesInBucket(bucket)
    local out = {}
    for _, entry in pairs(QBCore.Entity_Buckets) do
        if entry.bucket == bucket then out[#out + 1] = entry.id end
    end
    return out
end

AddEventHandler('entityRemoved', function(entity)
    QBCore.Entity_Buckets[entity] = nil
end)

--------------------------------------------------------------------------------------------------------------------
-- Vehicles (created on the server through ai-lib's `spawnVehicle`)
--------------------------------------------------------------------------------------------------------------------

---@param source? integer
---@param model string|integer
---@param coords? vector3|vector4|table
---@param warp? boolean
---@param kind? string the CreateVehicleServerSetter type; nil asks the player's client
---@param keys? boolean gives the player temporary keys
---@return integer vehicle the vehicle (0 when it could not be created)
local function spawn(source, model, coords, warp, kind, keys)
    if type(model) == 'number' then
        local entry = QBCore.Shared.VehicleHashes[model]
        model = entry and entry.model
    end
    if type(model) ~= 'string' or not model:match('^[%w_]+$') then return 0 end
    local id = playerId(source)
    local position
    if coords ~= nil then
        local at = vec3(coords)
        if not at then return 0 end
        local heading = coords.w
        if type(coords) == 'table' then heading = heading or coords.heading or coords.h end
        position = { x = at.x, y = at.y, z = at.z, w = tonumber(heading) or 0.0 }
    else
        local ped = id and GetPlayerPed(id) or 0
        if ped == 0 then return 0 end
        local at = GetEntityCoords(ped)
        position = { x = at.x, y = at.y, z = at.z, w = GetEntityHeading(ped) }
    end
    local vehicle = aiLib.spawnVehicle({
        model = model,
        coords = position,
        asker = kind == nil and id or nil,
        type = kind,
        driver = warp and id or nil,
        keysTo = keys and id or nil,
        purpose = keys and 'temporary' or nil,
    })
    return vehicle or 0
end

--- qb-core's server vehicle (the type asked from the player's client).
---@param source integer
---@param model string|integer
---@param coords? vector3|vector4
---@param warp? boolean
---@return integer
function QBCore.Functions.SpawnVehicle(source, model, coords, warp)
    return spawn(source, model, coords, warp, nil, false)
end

---@param source integer
---@param model string|integer
---@param coords? vector3|vector4
---@param warp? boolean
---@return integer
function QBCore.Functions.CreateAutomobile(source, model, coords, warp)
    return spawn(source, model, coords, warp, 'automobile', false)
end

---@param source integer
---@param model string|integer
---@param vehtype string automobile, bike, boat, heli, plane, submarine, trailer or train
---@param coords? vector3|vector4
---@param warp? boolean
---@return integer
function QBCore.Functions.CreateVehicle(source, model, vehtype, coords, warp)
    return spawn(source, model, coords, warp, type(vehtype) == 'string' and vehtype or 'automobile', false)
end

-- qb-core's own vehicle callbacks (its admin `/car`): ai-core admins only; the spawned car's keys go to the admin.
for name, kind in pairs({ ['QBCore:Server:SpawnVehicle'] = false, ['QBCore:Server:CreateVehicle'] = 'automobile' }) do
    QBCore.Functions.CreateCallback(name, function(source, cb, model, coords, warp)
        if not Bridge.isAdmin(source) or type(model) ~= 'string' or (coords ~= nil and not vec3(coords)) then return cb(nil) end
        local vehicle = spawn(source, model, coords, warp == true, kind or nil, true)
        cb(vehicle ~= 0 and DoesEntityExist(vehicle) and NetworkGetNetworkIdFromEntity(vehicle) or nil)
    end)
end

--------------------------------------------------------------------------------------------------------------------
-- Client callbacks (qb-core's event names; the client half is bridge/qb/client.lua)
--------------------------------------------------------------------------------------------------------------------

local CLIENT_CALLBACK_TIMEOUT = 30000

--- Asks a player's client callback (`QBCore.Functions.CreateClientCallback` there): `cb(...)` when the first extra
--- argument is a function, else waits and returns the first answer (nil after 30 s).
---@param name string
---@param source integer
---@param ... any
---@return any
function QBCore.Functions.TriggerClientCallback(name, source, ...)
    local id = playerId(source)
    if type(name) ~= 'string' or not id then return end
    local args = table.pack(...)
    local cb
    local first = 1
    if BridgeQB.isCallable(args[1]) then
        cb = args[1]
        first = 2
    end
    local key = name .. '\0' .. id
    local entry = { callback = cb, promise = promise.new() }
    QBCore.ClientCallbacks[key] = entry
    SetTimeout(CLIENT_CALLBACK_TIMEOUT, function()
        if QBCore.ClientCallbacks[key] ~= entry then return end
        QBCore.ClientCallbacks[key] = nil
        entry.promise:resolve(nil)
    end)
    TriggerClientEvent('QBCore:Client:TriggerClientCallback', id, name, table.unpack(args, first, args.n))
    if cb == nil then return Citizen.Await(entry.promise) end
end

RegisterNetEvent('QBCore:Server:TriggerClientCallback', function(name, ...)
    local src = source
    if type(name) ~= 'string' then return end
    local key = name .. '\0' .. src
    local entry = QBCore.ClientCallbacks[key]
    -- Only a request this player was asked can be answered.
    if not entry or not Bridge.allow(src) then return end
    QBCore.ClientCallbacks[key] = nil
    entry.promise:resolve((...))
    if entry.callback then entry.callback(...) end
end)

--------------------------------------------------------------------------------------------------------------------
-- Items
--------------------------------------------------------------------------------------------------------------------

--- Runs the registered use handler of an item for a player (qb-core forwards to qb-inventory's `UseItem`).
---@param source integer
---@param item string|table the item name or a QB item table
function QBCore.Functions.UseItem(source, item)
    local id = playerId(source)
    local name = type(item) == 'table' and item.name or item
    if not id or type(name) ~= 'string' then return end
    return Bridge.useItem(id, name, type(item) == 'table' and item or nil)
end

--------------------------------------------------------------------------------------------------------------------
-- Permissions (QB levels god / admin / mod are ai-core admins, ace `ai.admin`; QB-style aces still count)
--------------------------------------------------------------------------------------------------------------------

local QB_LEVELS = { god = true, admin = true, mod = true }

-- qb-core's aces: principal `qbcore.<level>` holds ace `<level>`.
CreateThread(function()
    for _, level in ipairs(QBCore.Config.Server.Permissions) do
        ExecuteCommand(('add_ace qbcore.%s %s allow'):format(level, level))
    end
end)

---@param source integer
---@param permission string
---@return boolean
local function allowed(source, permission)
    if type(permission) ~= 'string' then return false end
    if IsPlayerAceAllowed(tostring(source), permission) then return true end
    return QB_LEVELS[permission:lower()] == true and Bridge.isAdmin(tonumber(source) or 0)
end

---@param source integer
---@param permission string|string[]
---@return boolean
function QBCore.Functions.HasPermission(source, permission)
    if type(permission) == 'table' then
        for _, level in pairs(permission) do
            if allowed(source, level) then return true end
        end
        return false
    end
    return allowed(source, permission)
end

---@param source integer
---@return table<string, boolean>
function QBCore.Functions.GetPermission(source)
    local out = {}
    for _, level in ipairs(QBCore.Config.Server.Permissions) do
        if allowed(source, level) then out[level] = true end
    end
    return out
end

--- QB levels a player got with AddPermission (removed again when they leave: `player.<id>` is reused).
---@type table<integer, table<string, true>>
local granted = {}

---@param permission any
---@return string|nil
local function level(permission)
    if type(permission) ~= 'string' then return nil end
    permission = permission:lower()
    return permission:match('^[%w_%-]+$') and permission or nil
end

---@param source integer
---@param permission string
function QBCore.Functions.AddPermission(source, permission)
    local id, name = playerId(source), level(permission)
    if not id or not name or allowed(id, name) then return end
    ExecuteCommand(('add_principal player.%d qbcore.%s'):format(id, name))
    granted[id] = granted[id] or {}
    granted[id][name] = true
    QBCore.Commands.Refresh(id)
end

---@param source integer
---@param permission? string every QB level when left out
function QBCore.Functions.RemovePermission(source, permission)
    local id = playerId(source)
    if not id then return end
    local names = permission ~= nil and { level(permission) } or QBCore.Config.Server.Permissions
    for _, name in ipairs(names) do
        if granted[id] and granted[id][name] then
            ExecuteCommand(('remove_principal player.%d qbcore.%s'):format(id, name))
            granted[id][name] = nil
        end
    end
    QBCore.Commands.Refresh(id)
end

--- Admin message opt-in, admins only like qb-core; kept in ai-core metadata `optin` (absent = in), shared with the Qbox
--- exports, so it survives a reconnect.
---@param source integer
---@return boolean
function QBCore.Functions.IsOptin(source)
    local mirror = Bridge.players[tonumber(source) or -1]
    if not mirror or not QBCore.Functions.HasPermission(source, 'admin') then return false end
    return mirror.metadata.optin ~= false
end

---@param source integer
function QBCore.Functions.ToggleOptin(source)
    local mirror = Bridge.players[tonumber(source) or -1]
    if not mirror or not QBCore.Functions.HasPermission(source, 'admin') then return end
    local optin = mirror.metadata.optin == false
    Bridge.core:SetMeta(mirror.source, 'optin', optin)
    local player = getPlayer(source)
    if player then player.PlayerData.optin = optin end
    TriggerEvent('QBCore:Server:OnPlayerUpdated', source, 'optin', optin)
end

--- A ban in ai-core's ban list (`IsBanned`: license, FiveM id, Discord, ip): QB's `true, message` or false.
---@param source integer
---@return boolean, string?
function QBCore.Functions.IsPlayerBanned(source)
    local id = playerId(source)
    local ban = id and core:IsBanned(id) or nil
    if type(ban) ~= 'table' then return false end
    local ends = type(ban.expires) == 'number' and os.date('%d/%m/%Y %H:%M', math.floor(ban.expires / 1000)) or 'never'
    return true, ('You have been banned from the server:\n%s\nYour ban expires %s\n'):format(tostring(ban.reason), ends)
end

---@param source integer
---@return boolean
function QBCore.Functions.IsWhitelisted(source)
    if not QBCore.Config.Server.Whitelist then return true end
    return QBCore.Functions.HasPermission(source, QBCore.Config.Server.WhitelistPermission)
end

---@param license string
---@return boolean
function QBCore.Functions.IsLicenseInUse(license)
    for _, id in ipairs(GetPlayers()) do
        if GetPlayerIdentifierByType(id, 'license') == license then return true end
    end
    return false
end

---@param source integer
---@param reason string
---@param setKickReason? function
---@param deferrals? table
function QBCore.Functions.Kick(source, reason, setKickReason, deferrals)
    reason = tostring(reason or '')
    if setKickReason then setKickReason(reason) end
    CreateThread(function()
        if deferrals then
            deferrals.update(reason)
            Wait(2500)
        end
        local id = playerId(source)
        if id and GetPlayerPing(tostring(id)) >= 0 then DropPlayer(tostring(id), reason) end
    end)
end

--------------------------------------------------------------------------------------------------------------------
-- Core info
--------------------------------------------------------------------------------------------------------------------

--- The qb-core version whose API the bridge answers.
---@return string
function QBCore.Functions.GetCoreVersion() return '1.3.0' end

--- qb-core's database info from the `mysql_connection_string` convar (only the database name).
---@return { exists: boolean, database: string }
function QBCore.Functions.GetDatabaseInfo()
    local details = { exists = false, database = '' }
    local connection = GetConvar('mysql_connection_string', '')
    if connection == '' then return details end
    if connection:find('mysql://') then
        local rest = connection:sub(9, -1)
        details.database = (rest:sub((rest:find('/') or #rest) + 1, -1):gsub('[%?]+[%w%p]*$', ''))
        details.exists = details.database ~= ''
        return details
    end
    for part in connection:gmatch('[^;]+') do
        local name = part:match('^%s*[Dd]atabase%s*=%s*(.-)%s*$')
        if name then
            details.database, details.exists = name, true
            return details
        end
    end
    return details
end

--------------------------------------------------------------------------------------------------------------------
-- Shared registries: jobs and gangs scripts add become ai-core runtime definitions owned by that script (gone when
-- it stops; ai-core's definitionsChanged sends QB's Shared update); items scripts add stay in the bridge.
--------------------------------------------------------------------------------------------------------------------

local added = BridgeQB.added

--- A QB / Qbox job or gang table (`label`, `type`, `defaultDuty`, grades keyed `'0'` / `0` with `name`, `payment`,
--- `isboss`) as the bridge's script definition; nil when it is not one.
---@param kind BridgeDefinitionKind
---@param name string
---@param value any
---@return BridgeScriptDefinition|nil
local function scriptDefinition(kind, name, value)
    if type(value) ~= 'table' then return nil end
    local grades = {}
    for key, grade in pairs(type(value.grades) == 'table' and value.grades or {}) do
        local number = Bridge.gradeNumber(key)
        if not number or type(grade) ~= 'table' then return nil end
        local label = grade.name or grade.label
        grades[number] = { label = type(label) == 'string' and label or ('Grade %d'):format(number), salary = math.max(0, math.floor(tonumber(grade.payment) or 0)), boss = grade.isboss == true }
    end
    local definition = { label = type(value.label) == 'string' and value.label or name, grades = grades }
    if kind == 'job' then
        definition.type = type(value.type) == 'string' and value.type or 'none'
        definition.defaultDuty = value.defaultDuty == true
    end
    return definition
end
BridgeQB.scriptDefinition = scriptDefinition

---@param kind BridgeDefinitionKind
local function definitionRegistry(kind)
    local invalid, exists, missing = ('invalid_%s_name'):format(kind), ('%s_exists'):format(kind), ('%s_not_exists'):format(kind)
    local managed, foreign = ('%s_managed_by_ai_core'):format(kind), ('%s_owned_by_another_resource'):format(kind)
    ---@return string|nil error
    local function put(name, value, owner)
        local definition = scriptDefinition(kind, name, value)
        if not definition then return invalid end
        local ok, err = Bridge.putDefinition(kind, name, definition, owner)
        if ok then return nil end
        return err == 'CORE_ERR_DEFINITION_OWNER' and foreign or err == 'CORE_ERR_DEFINITION_PANEL' and exists or invalid
    end
    local function add(name, value)
        if type(name) ~= 'string' then return false, invalid end
        if Bridge.definitionExists(kind, name) then return false, exists end
        local err = put(name, value, GetInvokingResource() or 'ai-core')
        if err then return false, err end
        return true, 'success'
    end
    local function addMany(values)
        if type(values) ~= 'table' then return false, invalid end
        for name, value in pairs(values) do
            if type(name) ~= 'string' or not scriptDefinition(kind, name, value) then return false, invalid, value end
            if Bridge.definitionExists(kind, name) then return false, exists, value end
        end
        local owner = GetInvokingResource() or 'ai-core'
        for name, value in pairs(values) do
            local err = put(name, value, owner)
            if err then return false, err, value end
        end
        return true, 'success', nil
    end
    -- ai-core's panel jobs and gangs are changed in the panel; a script changes only its own.
    local function update(name, value)
        if type(name) ~= 'string' then return false, invalid end
        if not Bridge.scriptDefinition(kind, name) then return false, Bridge.definitionExists(kind, name) and managed or missing end
        local err = put(name, value, GetInvokingResource() or 'ai-core')
        if err then return false, err end
        return true, 'success'
    end
    local function remove(name)
        if type(name) ~= 'string' then return false, invalid end
        if not Bridge.scriptDefinition(kind, name) then return false, Bridge.definitionExists(kind, name) and managed or missing end
        if not Bridge.dropDefinition(kind, name, GetInvokingResource() or 'ai-core') then return false, foreign end
        return true, 'success'
    end
    return add, addMany, update, remove
end

QBCore.Functions.AddJob, QBCore.Functions.AddJobs, QBCore.Functions.UpdateJob, QBCore.Functions.RemoveJob = definitionRegistry('job')
QBCore.Functions.AddGang, QBCore.Functions.AddGangs, QBCore.Functions.UpdateGang, QBCore.Functions.RemoveGang = definitionRegistry('gang')

---@param name string|nil
---@param value any
local function itemsChanged(name, value)
    if name then
        TriggerClientEvent('QBCore:Client:OnSharedUpdate', -1, 'Items', name, value)
    else
        TriggerClientEvent('QBCore:Client:OnSharedUpdateMultiple', -1, 'Items', value)
    end
    TriggerEvent('QBCore:Server:UpdateObject')
end

---@param name string
---@return boolean
local function itemExists(name) return added.Items[name] ~= nil or Bridge.itemDefinition(name) ~= nil end

function QBCore.Functions.AddItem(name, value)
    if type(name) ~= 'string' then return false, 'invalid_item_name' end
    if itemExists(name) then return false, 'item_exists' end
    added.Items[name] = value
    itemsChanged(name, value)
    return true, 'success'
end

function QBCore.Functions.AddItems(values)
    if type(values) ~= 'table' then return false, 'invalid_item_name' end
    for name, value in pairs(values) do
        if type(name) ~= 'string' then return false, 'invalid_item_name', value end
        if itemExists(name) then return false, 'item_exists', value end
    end
    for name, value in pairs(values) do added.Items[name] = value end
    itemsChanged(nil, values)
    return true, 'success', nil
end

-- The inventory's own items are changed in the inventory, never by a script.
function QBCore.Functions.UpdateItem(name, value)
    if type(name) ~= 'string' then return false, 'invalid_item_name' end
    if added.Items[name] == nil then return false, Bridge.itemDefinition(name) and 'item_managed_by_ai_core' or 'item_not_exists' end
    added.Items[name] = value
    itemsChanged(name, value)
    return true, 'success'
end

function QBCore.Functions.RemoveItem(name)
    if type(name) ~= 'string' then return false, 'invalid_item_name' end
    if added.Items[name] == nil then return false, Bridge.itemDefinition(name) and 'item_managed_by_ai_core' or 'item_not_exists' end
    added.Items[name] = nil
    itemsChanged(name, nil)
    return true, 'success'
end

--- Adds a function to QBCore.Functions (never replaces one).
---@param methodName string
---@param handler function
---@return boolean, string
function QBCore.Functions.SetMethod(methodName, handler)
    if type(methodName) ~= 'string' then return false, 'invalid_method_name' end
    if QBCore.Functions[methodName] ~= nil then return false, 'method_exists' end
    QBCore.Functions[methodName] = handler
    TriggerEvent('QBCore:Server:UpdateObject')
    return true, 'success'
end

--- Adds a field to QBCore (never replaces one).
---@param fieldName string
---@param data any
---@return boolean, string
function QBCore.Functions.SetField(fieldName, data)
    if type(fieldName) ~= 'string' then return false, 'invalid_field_name' end
    if QBCore[fieldName] ~= nil then return false, 'field_exists' end
    QBCore[fieldName] = data
    TriggerEvent('QBCore:Server:UpdateObject')
    return true, 'success'
end

-- The client half reads the inventory's item definitions and ai-core's jobs / gangs itself; only the items scripts
-- added here reach a loading player's client (once, latent).
local LATENT_BPS = 200000

Bridge.on('loaded', function(source)
    if next(added.Items) then TriggerLatentClientEvent('QBCore:Client:OnSharedUpdateMultiple', source, LATENT_BPS, 'Items', added.Items) end
end)

-- Another inventory became active: the server's core object reads its items again.
AddEventHandler('ai-core:inventoryChanged', function()
    TriggerEvent('QBCore:Server:UpdateObject')
end)

--------------------------------------------------------------------------------------------------------------------
-- Commands (through ai-lib's `addCommand`: QB levels are ai-core admins, `user` is everyone)
--------------------------------------------------------------------------------------------------------------------

local t ---@type fun(key: string, ...: string|number): string

---@param source integer
---@param text string
local function reply(source, text)
    if source > 0 then Bridge.notify(source, text, 'error') else print(text) end
end

---@param source integer
---@param entry { name: string, permission: string|string[] }
---@return boolean
local function mayUse(source, entry)
    local permissions = type(entry.permission) == 'table' and entry.permission or { entry.permission }
    for _, permission in ipairs(permissions) do
        if permission == 'user' then return true end
    end
    return Bridge.isAdmin(source) or IsPlayerAceAllowed(tostring(source), 'command.' .. entry.name) or QBCore.Functions.HasPermission(source, permissions)
end

---@param name string
---@param help string
---@param arguments? { name: string, help: string }[]
---@param argsrequired? boolean
---@param callback fun(source: integer, args: string[], rawCommand: string)
---@param permission? string
---@param ... string more permission levels
function QBCore.Commands.Add(name, help, arguments, argsrequired, callback, permission, ...)
    if type(name) ~= 'string' or not name:match('^[%w_%-%.]+$') then return end
    arguments = type(arguments) == 'table' and arguments or {}
    local permissions = { type(permission) == 'string' and permission:lower() or 'user' }
    for _, extra in ipairs({ ... }) do
        if type(extra) == 'string' then permissions[#permissions + 1] = extra:lower() end
    end
    local restricted = permissions[1] ~= 'user'
    local aces = { 'ai.admin' }
    for _, level2 in ipairs(permissions) do
        if not QBCore.Commands.IgnoreList[level2] and level2:match('^[%w_%-]+$') then
            aces[#aces + 1] = level2
            ExecuteCommand(('add_ace qbcore.%s command.%s allow'):format(level2, name))
        end
    end
    aiLib.addCommand(name, { help = help, restricted = restricted and aces or false }, function(source, _, raw)
        local args = Bridge.words(raw)
        if argsrequired and #args < #arguments then
            t = t or aiLib.locale('ai-core')
            local missing = arguments[#args + 1]
            return reply(source, t('COMMAND_MISSING', type(missing) == 'table' and tostring(missing.name) or '?'))
        end
        TriggerEvent('QBCore:Server:PreCommandExecution', source, name, args, raw)
        if WasEventCanceled() then return end
        callback(source, args, raw)
    end)
    QBCore.Commands.List[name:lower()] = {
        name = name:lower(),
        permission = #permissions == 1 and permissions[1] or permissions,
        help = help,
        arguments = arguments,
        argsrequired = argsrequired == true,
        callback = callback,
    }
end

--- Sends a player the chat suggestions of the QB commands they may use and removes the others.
---@param source integer
function QBCore.Commands.Refresh(source)
    local id = playerId(source)
    if not id or not Bridge.players[id] then return end
    local suggestions = {}
    for command, entry in pairs(QBCore.Commands.List) do
        if mayUse(id, entry) then
            suggestions[#suggestions + 1] = { name = '/' .. command, help = entry.help, params = entry.arguments }
        else
            TriggerClientEvent('chat:removeSuggestion', id, '/' .. command)
        end
    end
    TriggerClientEvent('chat:addSuggestions', id, suggestions)
end

--------------------------------------------------------------------------------------------------------------------
-- Net events (client values are checked; every one goes through the bridge's rate gate)
--------------------------------------------------------------------------------------------------------------------

---@param src integer
---@return QBPlayer|nil
local function caller(src)
    if not Bridge.players[src] or not Bridge.allow(src) then return nil end
    return getPlayer(src)
end

-- qb-core's duty toggle (duty points, job menus).
RegisterNetEvent('QBCore:ToggleDuty', function()
    local src = source
    local player = caller(src)
    if not player then return end
    local job = player.PlayerData.job
    core:SetDuty(src, (not job.onduty) and job.name or nil)
end)

-- qb-adminmenu style command calls without the chat.
RegisterNetEvent('QBCore:CallCommand', function(command, args)
    local src = source
    if type(command) ~= 'string' then return end
    local entry = QBCore.Commands.List[command:lower()]
    if not entry or not caller(src) or not mayUse(src, entry) then return end
    local words = {}
    if type(args) == 'table' then
        for i = 1, math.min(#args, 32) do words[i] = tostring(args[i]) end
    end
    if entry.argsrequired and #entry.arguments ~= 0 and not words[#entry.arguments] then return end
    entry.callback(src, words, '/' .. command .. ' ' .. table.concat(words, ' '))
end)

-- Closing the server to everyone without qb-core's `qbadmin.join` ace (or ai-core admin): joins are refused through
-- ai-core's connection gate, connected players without the whitelist level are kicked.
RegisterNetEvent('QBCore:Server:CloseServer', function(reason)
    local src = source
    if not Bridge.allow(src) or not QBCore.Functions.HasPermission(src, 'admin') then return end
    QBCore.Config.Server.Closed = true
    QBCore.Config.Server.ClosedReason = type(reason) == 'string' and reason:sub(1, 200) or 'No reason specified'
    for id in pairs(QBCore.Players) do
        if not QBCore.Functions.HasPermission(id, QBCore.Config.Server.WhitelistPermission) then
            QBCore.Functions.Kick(id, QBCore.Config.Server.ClosedReason)
        end
    end
end)

RegisterNetEvent('QBCore:Server:OpenServer', function()
    local src = source
    if not Bridge.allow(src) or not QBCore.Functions.HasPermission(src, 'admin') then return end
    QBCore.Config.Server.Closed = false
end)

CreateThread(function()
    core:AddConnectionCheck('qb-core:closed', function(source)
        if not QBCore.Config.Server.Closed then return nil end
        local id = tostring(source)
        if IsPlayerAceAllowed(id, 'qbadmin.join') or IsPlayerAceAllowed(id, 'ai.admin') then return nil end
        return QBCore.Config.Server.ClosedReason
    end)
end)

-- Old qb-inventory: the client asks to use an item. The stack is read from the inventory, never taken from the client.
RegisterNetEvent('QBCore:Server:UseItem', function(item)
    local src = source
    local name = type(item) == 'table' and item.name or item
    if type(name) ~= 'string' or not caller(src) then return end
    local slot = type(item) == 'table' and tonumber(item.slot) or nil
    for _, stack in ipairs(core:GetItems(src) or {}) do
        if stack.name == name and (not slot or stack.slot == slot) then
            return Bridge.useItem(src, name, BridgeQB.qbStack(stack))
        end
    end
end)

-- Old scripts: the client takes its own items (never gives: `QBCore:Server:AddItem` is not answered).
RegisterNetEvent('QBCore:Server:RemoveItem', function(itemName, amount, slot)
    local src = source
    local count = tonumber(amount) or 1
    if type(itemName) ~= 'string' or count <= 0 or math.type(count) ~= 'integer' or not caller(src) then return end
    core:RemoveItem(src, itemName, count, nil, tonumber(slot))
end)

-- Old HUDs: the client reports its needs. Only a change that hurts the player is taken (less hunger / thirst, more
-- stress); anything else could be a cheat.
local SELF_REPORTED = { hunger = -1, thirst = -1, stress = 1 }
RegisterNetEvent('QBCore:Server:SetMetaData', function(key, value)
    local src = source
    local direction = SELF_REPORTED[key]
    local number = tonumber(value)
    local player = direction and number and caller(src)
    if not player then return end
    local current = tonumber(player.PlayerData.metadata[key]) or 0
    number = math.min(100, math.max(0, number --[[@as number]]))
    if (number - current) * direction > 0 then core:SetMeta(src, key, number) end
end)

AddEventHandler('playerDropped', function()
    local src = source
    local license = Bridge.license(src)
    if license then QBCore.Player_Buckets[license] = nil end
    for name in pairs(granted[src] or {}) do ExecuteCommand(('remove_principal player.%d qbcore.%s'):format(src, name)) end
    granted[src] = nil
end)

AddEventHandler('onResourceStop', function(resource)
    for name, entry in pairs(QBCore.UsableItems) do
        if entry.resource == resource then QBCore.UsableItems[name] = nil end
    end
end)

--------------------------------------------------------------------------------------------------------------------
-- Exports: qb-core exports every QBCore.Functions function under its name, plus a few of QBCore.Player
--------------------------------------------------------------------------------------------------------------------

for name, fn in pairs(QBCore.Functions) do
    if type(fn) == 'function' then Bridge.provideExport('qb-core', name, fn) end
end
Bridge.provideExport('qb-core', 'GetOfflinePlayerByLicense', QBCore.Player.GetOfflinePlayerByLicense)
Bridge.provideExport('qb-core', 'ExploitBan', exploitBan)
