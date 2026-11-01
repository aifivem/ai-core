-- QBCore's server events from ai-core's changes (same names and arguments as QBCore); they keep the Player objects
-- and their lookups current.

local qbJob, qbGang = BridgeShapes.qbJob, BridgeShapes.qbGang
local qbJobDefinition, qbGangDefinition = BridgeShapes.qbJobDefinition, BridgeShapes.qbGangDefinition
local copy, META_DEFAULTS, CHARINFO_KEY, applyCharinfo = BridgeQB.copy, BridgeQB.metaDefaults, BridgeQB.charinfoKey, BridgeQB.applyCharinfo
local qbPlayers, byCitizenPlayer, byPhone, byAccount, byLicense = BridgeQB.players, BridgeQB.byCitizenId, BridgeQB.byPhone, BridgeQB.byAccount, BridgeQB.byLicense
local itemsReadAt, playerUpdated, build = BridgeQB.itemsReadAt, BridgeQB.playerUpdated, BridgeQB.build

-- QBCore's server events from ai-core's changes (same names and arguments as QBCore).
Bridge.on('loaded', function(source)
    local player = build(source)
    if not player then return end
    TriggerEvent('QBCore:Server:PlayerLoaded', player)
    player.Functions.UpdateClient()
end)

Bridge.on('unloaded', function(source, reason)
    local player = qbPlayers[source]
    if reason == 'dropped' then TriggerEvent('QBCore:Server:PlayerDropped', source) end
    TriggerEvent('QBCore:Server:OnPlayerUnload', source)
    if player then
        local data = player.PlayerData
        if byPhone[data.charinfo.phone] == source then byPhone[data.charinfo.phone] = nil end
        if byAccount[data.charinfo.account] == source then byAccount[data.charinfo.account] = nil end
        if data.license and byLicense[data.license] == source then byLicense[data.license] = nil end
        if byCitizenPlayer[data.citizenid] == player then byCitizenPlayer[data.citizenid] = nil end
    end
    qbPlayers[source] = nil
    itemsReadAt[source] = nil
end)

Bridge.on('money', function(source, account, _, delta, reason)
    TriggerEvent('QBCore:Server:OnMoneyChange', source, account, math.abs(delta), delta >= 0 and 'add' or 'remove', reason)
    local player = qbPlayers[source]
    if player then playerUpdated(source, 'money', player.PlayerData.money) end
end)

Bridge.on('job', function(source, job)
    local player = qbPlayers[source]
    local view = qbJob(job)
    local wasOnDuty = player and player.PlayerData.job.onduty
    if player then player.PlayerData.job = view end
    TriggerEvent('QBCore:Server:OnJobUpdate', source, qbJob(job))
    if player then playerUpdated(source, 'job', view) end
    if wasOnDuty ~= nil and wasOnDuty ~= view.onduty then TriggerEvent('QBCore:Server:SetDuty', source, view.onduty) end
end)

Bridge.on('gang', function(source, gang)
    local player = qbPlayers[source]
    if player then player.PlayerData.gang = qbGang(gang) end
    TriggerEvent('QBCore:Server:OnGangUpdate', source, qbGang(gang))
    if player then playerUpdated(source, 'gang', player.PlayerData.gang) end
end)

Bridge.on('meta', function(source, key, value)
    local player = qbPlayers[source]
    if not player then return end
    local data = player.PlayerData
    if key == CHARINFO_KEY then
        if type(value) ~= 'table' then return end
        byAccount[data.charinfo.account] = nil
        if value.account then data.charinfo.account = value.account end
        data.charinfo.card = value.card
        byAccount[data.charinfo.account] = source
        playerUpdated(source, 'charinfo', data.charinfo)
        return
    end
    if value == nil then value = copy(META_DEFAULTS[key]) end
    data.metadata[key] = value
    playerUpdated(source, 'metadata', data.metadata)
end)

-- ai-core changed the character's name, birth date or nationality (QB / Qbox SetCharInfo).
Bridge.on('character', function(source)
    local player, mirror = qbPlayers[source], Bridge.players[source]
    if not player or not mirror then return end
    local c, charinfo = mirror.character, player.PlayerData.charinfo
    applyCharinfo(charinfo, { firstname = c.firstname, lastname = c.lastname, birthdate = c.birthdate, nationality = c.nationality or '', sex = c.sex })
    playerUpdated(source, 'charinfo', charinfo)
end)

-- A panel edit of a job or gang: QB's shared update (server object refresh, every client's Shared table).
AddEventHandler('ai-core:definitionsChanged', function(file, name)
    local tableName = file == 'jobs' and 'Jobs' or file == 'gangs' and 'Gangs' or nil
    if not tableName or type(name) ~= 'string' then return end
    local definition = (file == 'jobs' and Bridge.jobDefinitions() or Bridge.gangDefinitions())[name]
    local value = definition and (file == 'jobs' and qbJobDefinition(definition --[[@as AiJobDefinition]]) or qbGangDefinition(definition)) or nil
    TriggerClientEvent('QBCore:Client:OnSharedUpdate', -1, tableName, name, value)
    TriggerEvent('QBCore:Server:UpdateObject')
end)
