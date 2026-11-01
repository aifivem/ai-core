-- QBCore.Player: login, logout, players by license, CreatePlayer / CheckPlayerData, save and character deletes.

local core = Bridge.core
local getPlayer, getOfflinePlayer, detachedPlayer = BridgeQB.getPlayer, BridgeQB.getOfflinePlayer, BridgeQB.detachedPlayer
local playerId, succeeded, exploitDrop, applyDefaults = BridgeQB.playerId, BridgeQB.succeeded, BridgeQB.exploitDrop, BridgeQB.applyDefaults

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
