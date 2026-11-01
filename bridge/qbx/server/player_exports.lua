-- qbx_core's player exports: lookups, login / logout / delete (the QB bridge's), SetPlayerData and SetCharInfo.

local core = Bridge.core
local provide, byUserId, userIds = BridgeQbox.provide, BridgeQbox.byUserId, BridgeQbox.userIds
local resolve, resolveSource, sourceOfIdentifier = BridgeQbox.resolve, BridgeQbox.resolveSource, BridgeQbox.sourceOfIdentifier
local getOfflinePlayer, qboxOffline = BridgeQbox.getOfflinePlayer, BridgeQbox.qboxOffline

provide('GetPlayer', function(identifier)
    local source = math.tointeger(tonumber(identifier))
    if not source then source = sourceOfIdentifier(identifier) end
    return BridgeQB.getPlayer(source)
end)
provide('GetPlayerByCitizenId', BridgeQB.getPlayerByCitizenId)
provide('GetOfflinePlayer', getOfflinePlayer)
provide('GetPlayerByUserId', function(userId)
    local source = byUserId[math.tointeger(tonumber(userId)) or -1]
    return source and BridgeQB.getPlayer(source) or nil
end)
provide('GetPlayerByPhone', function(number)
    local source = number ~= nil and aiLib.phone.sourceOf(tostring(number)) or nil
    return source and BridgeQB.getPlayer(source) or nil
end)
provide('GetSource', sourceOfIdentifier)
provide('GetUserId', function(identifier) return userIds[sourceOfIdentifier(identifier)] or 0 end)
provide('GetQBPlayers', function() return QBCore.Functions.GetQBPlayers() end)
provide('GetPlayersData', function()
    local out = {}
    for source in pairs(Bridge.players) do
        local player = BridgeQB.getPlayer(source)
        if player then out[#out + 1] = player.PlayerData end
    end
    return out
end)
provide('IsPlayerLoaded', function(source) return Bridge.players[source] ~= nil end)
-- Login / logout / delete: the QB bridge's (one implementation; Qbox's newData has QB's `cid` and `charinfo`).
provide('Login', function(source, citizenid, newData) return QBCore.Player.Login(source, citizenid, newData) end)
provide('Logout', function(source) QBCore.Player.Logout(source) end)
provide('Save', function(source) QBCore.Player.Save(source) end)
--- Changes on an offline Player are written as they happen.
provide('SaveOffline', function() end)
provide('CreatePlayer', function(playerData, offline)
    if type(playerData) ~= 'table' then return nil end
    return qboxOffline(QBCore.Player.CreatePlayer(playerData, offline))
end)
--- Qbox's export is its admin delete (ForceDeleteCharacter): a loaded character's player is dropped first.
provide('DeleteCharacter', function(citizenid) QBCore.Player.ForceDeleteCharacter(citizenid) end)

-- Every soft delete of a character (character screen, panel, DeleteCharacter); ai-core's citizenid is the id as text.
AddEventHandler('ai-core:characterDeleted', function(charId)
    TriggerEvent('qbx_core:server:characterDeleted', tostring(charId))
end)

--- Qbox's SetPlayerData: `metadata`, `job`, `gang` and `charinfo` go to ai-core (a stored character's through the
--- offline exports); other fields stay on the player object for the session.
---@param identifier integer|string
---@param key string
---@param value any
local function setPlayerData(identifier, key, value)
    if type(key) ~= 'string' then return end
    local source, offline = resolve(identifier)
    if offline then return offline.Functions.SetPlayerData(key, value) end
    local player = source and BridgeQB.getPlayer(source)
    if not source or not player then return end
    if key == 'metadata' and type(value) == 'table' then
        local current = Bridge.players[source].metadata
        for metaKey, metaValue in pairs(value) do
            if current[metaKey] ~= metaValue then core:SetMeta(source, metaKey, metaValue) end
        end
        return
    end
    if key == 'charinfo' or key == 'job' or key == 'gang' then return player.Functions.SetPlayerData(key, value) end
    player.PlayerData[key] = value
    ---@diagnostic disable-next-line: fivem/event-wrong-side
    TriggerEvent('QBCore:Player:SetPlayerData', player.PlayerData)
end
provide('SetPlayerData', setPlayerData)
provide('UpdatePlayerData', function(identifier)
    local source = resolveSource(identifier)
    local player = source and BridgeQB.getPlayer(source)
    if not player then return end
    ---@diagnostic disable-next-line: fivem/event-wrong-side
    TriggerEvent('QBCore:Player:SetPlayerData', player.PlayerData)
end)
--- One charinfo value: names, birth date, nationality and (stored characters) gender go to ai-core's character, the
--- account number and card to its metadata, anything else stays on the player object for the session.
provide('SetCharInfo', function(identifier, key, value)
    if type(key) ~= 'string' then return end
    local source, offline = resolve(identifier)
    local player = offline or (source and BridgeQB.getPlayer(source))
    if not player then return end
    local charinfo = player.PlayerData.charinfo
    if key == 'firstname' or key == 'lastname' or key == 'birthdate' or key == 'nationality' or key == 'gender' or key == 'account' or key == 'card' then
        local patch = {}
        for k, v in pairs(charinfo) do patch[k] = v end
        patch[key] = value
        return player.Functions.SetPlayerData('charinfo', patch)
    end
    charinfo[key] = value
    if offline then return end
    ---@diagnostic disable-next-line: fivem/event-wrong-side
    TriggerEvent('QBCore:Player:SetPlayerData', player.PlayerData)
end)

BridgeQbox.setPlayerData = setPlayerData
