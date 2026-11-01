-- ESX on ai-core, server side: ESX's player events from ai-core's changes (load, spawn, logout, drop, job, money) and
-- the character screens' ESX login and logout.

local xPlayers, build, countJob = BridgeESX.xPlayers, BridgeESX.build, BridgeESX.countJob
local accountsOf, esxAccount, pendingSet = BridgeESX.accountsOf, BridgeESX.esxAccount, BridgeESX.pendingSet
local byLicense, licenseOf = BridgeESX.byLicense, BridgeESX.licenseOf
local esxJob = BridgeShapes.esxJob

aiLib.onClientEvent('esx:onPlayerSpawn', function(src)
    local x = xPlayers[src]
    if x then x.spawned = true end
end, { rate = { count = 2, windowMs = 1000 } })

AddEventHandler('ai-core:playerSpawned', function(src)
    local x = xPlayers[src]
    if x then x.spawned = true end
end)

-- ESX's drop request: ai-core saves and unloads characters itself; the caller's callback runs.
AddEventHandler('esx:onPlayerDropped', function(_, _, cb)
    if cb then cb() end
end)

-- Character screens in ESX mode (esx_multicharacter, tgiann-multichar, 0r): `esx:onPlayerJoined(src, 'char<N>', data?)`
-- loads the account's character in slot N, or creates it from `data` (esx_identity's fields); a server event only, as
-- in es_extended's multichar mode. docs/compat/multichar.md.
AddEventHandler('esx:onPlayerJoined', function(src, char, data)
    -- A client cannot raise it (never a net event here); `source` is a player id only for one that came from a client.
    if (tonumber(source) or 0) > 0 then return end
    local id = Bridge.loginSource(src)
    local slot = type(char) == 'string' and math.tointeger(tonumber(char:match('^%a*(%d+)$') or char:match('^%a*(%d+):') or ''))
    if not id or not slot or slot < 1 then return end
    local license = type(char) == 'string' and char:match(':(.+)$')
    if license and license ~= ESX.GetIdentifier(id) then return end
    if type(data) ~= 'table' then
        Bridge.login(id, { slot = slot })
        return
    end
    Bridge.createCharacter(id, {
        firstname = tostring(data.firstname or ''),
        lastname = tostring(data.lastname or ''),
        birthdate = Bridge.isoDate(data.dateofbirth) or '',
        sex = Bridge.sexOf(data.sex),
        slot = slot,
        height = tonumber(data.height),
    })
end)

--- Players whose logout a script asked for with `esx:playerLogout` (the unload then does not raise it again).
---@type table<integer, true>
local logoutAsked = {}
--- The bridge raises `esx:playerLogout` itself for listeners when a character unloads; its own raise is not a request.
local raisingLogout = false

-- A character screen's logout: ai-core saves and unloads the character (`LogoutCharacter`), then `cb` runs.
AddEventHandler('esx:playerLogout', function(playerId, cb)
    if raisingLogout or (tonumber(source) or 0) > 0 then return end
    local id = math.tointeger(tonumber(playerId))
    if not id or not Bridge.players[id] then
        if cb then cb() end
        return
    end
    logoutAsked[id] = true
    Bridge.logout(id, function(ok)
        if not ok then logoutAsked[id] = nil end
        if cb then cb() end
    end)
end)

-- ESX's server events from ai-core's changes (same names and arguments as ESX).
local loadedCount = 0

Bridge.on('loaded', function(source)
    local x = build(source)
    if not x then return end
    loadedCount = loadedCount + 1
    GlobalState.playerCount = loadedCount
    countJob(x.job.name, 1)
    local license = ESX.GetIdentifier(source)
    if license then byLicense[license], licenseOf[source] = source, license end
    local state = Player(source).state
    state:set('identifier', x.identifier, false)
    state:set('license', x.license, false)
    state:set('job', x.job, true)
    state:set('group', x.group, true)
    state:set('name', x.name, true)
    -- The client half keeps these in PlayerData (ESX sends them with its own playerLoaded payload).
    TriggerClientEvent('esx:setGroup', source, x.group)
    TriggerClientEvent('esx:setMaxWeight', source, x.maxWeight)
    ---@diagnostic disable-next-line: fivem/event-wrong-side -- ESX server scripts listen to it on the server too
    TriggerEvent('esx:playerLoaded', source, x, false)
end)

Bridge.on('unloaded', function(source, reason)
    local x = xPlayers[source]
    if x then x.beginAccountShutdown() end
    if reason == 'dropped' then TriggerEvent('esx:playerDropped', source, reason)
    else
        -- A logout ai-core made itself (its character screen, a switch) is announced as ESX's logout; one a script
        -- asked for was already raised by that script.
        if not logoutAsked[source] then
            raisingLogout = true
            TriggerEvent('esx:playerLogout', source, nil)
            raisingLogout = false
        end
        TriggerEvent('esx:playerDropped', source, 'esx_player_logout')
    end
    logoutAsked[source] = nil
    local license = licenseOf[source]
    if license and byLicense[license] == source then byLicense[license] = nil end
    licenseOf[source] = nil
    if x then
        countJob(x.job.name, -1)
        loadedCount = math.max(0, loadedCount - 1)
        GlobalState.playerCount = loadedCount
    end
    xPlayers[source] = nil
    pendingSet[source] = nil
end)

-- ai-core changed the character's name (SetCharacterInfo).
Bridge.on('character', function(source)
    local x, mirror = xPlayers[source], Bridge.players[source]
    if not x or not mirror then return end
    x.setName(('%s %s'):format(mirror.character.firstname, mirror.character.lastname))
end)

Bridge.on('job', function(source, job)
    local x = xPlayers[source]
    local last = x and x.job or nil
    local next = esxJob(job)
    if x then
        x.job = next
        countJob(last and last.name, -1)
        countJob(next.name, 1)
    end
    Player(source).state:set('job', next, true)
    ---@diagnostic disable-next-line: fivem/event-wrong-side -- ESX server scripts listen to it on the server too
    TriggerEvent('esx:setJob', source, next, last)
end)

Bridge.on('money', function(source, account, balance, delta, reason)
    local mirror = Bridge.players[source]
    local x = xPlayers[source]
    if x and mirror then x.accounts = accountsOf(mirror) end
    local name = esxAccount(account)
    local sets = pendingSet[source]
    if sets and sets[account] and sets[account] >= GetGameTimer() then
        sets[account] = nil
        ---@diagnostic disable-next-line: fivem/event-wrong-side -- ESX server scripts listen to it on the server too
        TriggerEvent('esx:setAccountMoney', source, name, balance, reason)
    elseif delta > 0 then TriggerEvent('esx:addAccountMoney', source, name, delta, reason)
    elseif delta < 0 then TriggerEvent('esx:removeAccountMoney', source, name, -delta, reason) end
end)
