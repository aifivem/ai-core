-- qbx_core's gang membership exports (loaded characters through ai-core's player, stored ones through its offline
-- character exports) and the group queries.

local core = Bridge.core
local provide, qboxGangs, resolve, member = BridgeQbox.provide, BridgeQbox.qboxGangs, BridgeQbox.resolve, BridgeQbox.member
local charIdOf, offlineAnswer, playerNotFound, groupNotFound = BridgeQbox.charIdOf, BridgeQbox.offlineAnswer, BridgeQbox.playerNotFound, BridgeQbox.groupNotFound
local gangMap = BridgeQbox.gangMap

---@param citizenid string|integer
---@param gangName string
---@param grade? integer
---@return boolean, QboxErrorResult?
local function addPlayerToGang(citizenid, gangName, grade)
    gangName = tostring(gangName):lower()
    grade = math.tointeger(tonumber(grade)) or 0
    if gangName == 'none' then return false, { code = 'none', message = 'none is the default gang, so players cannot be added to it' } end
    local gang = qboxGangs()[gangName]
    if not gang then return groupNotFound('gang_not_found', gangName) end
    if not gang.grades[grade] then return false, { code = 'gang_missing_grade', message = ('gang %s does not have grade %s'):format(gangName, grade) } end
    local source, offline = member(citizenid)
    if offline then
        if offline.PlayerData.gangs[gangName] == grade then return true end
        return offlineAnswer(Bridge.await('SetOfflineGang', charIdOf(offline), gangName, grade), 'max_gangs')
    end
    if not source then return playerNotFound(tostring(citizenid)) end
    if gangMap(Bridge.players[source])[gangName] == grade then return true end
    if not core:SetGang(source, gangName, grade) then return false, { code = 'max_gangs', message = 'ai-core refused the gang (maximum gangs reached)' } end
    return true
end

---@param citizenid string|integer
---@param gangName string
---@return boolean, QboxErrorResult?
local function removePlayerFromGang(citizenid, gangName)
    if gangName == 'none' then return false, { code = 'none', message = 'none is the default gang, so players cannot be removed from it' } end
    local source, offline = member(citizenid)
    if offline then
        if offline.PlayerData.gangs[gangName] == nil then return true end
        return offlineAnswer(Bridge.await('RemoveOfflineGang', charIdOf(offline), gangName), 'gang_not_removed')
    end
    if not source then return playerNotFound(tostring(citizenid)) end
    if gangMap(Bridge.players[source])[gangName] == nil then return true end
    return core:RemoveGang(source, gangName) == true
end

--- The primary gang is ai-core's active gang (a loaded character's only: a stored character's first gang becomes
--- active by itself).
---@param citizenid string|integer
---@param gangName string
---@return boolean, QboxErrorResult?
local function setPrimaryGang(citizenid, gangName)
    local source, offline = member(citizenid)
    if offline then
        if offline.PlayerData.gang.name == gangName then return true end
        return false, { code = 'player_not_loaded', message = ('the active gang of %s changes only while the character is loaded'):format(tostring(citizenid)) }
    end
    if not source then return playerNotFound(tostring(citizenid)) end
    if gangName == 'none' then return core:SetActiveGang(source, nil) == true end
    if gangMap(Bridge.players[source])[gangName] == nil then
        return false, { code = 'player_not_in_gang', message = ('player %s does not have gang %s'):format(tostring(citizenid), tostring(gangName)) }
    end
    if not qboxGangs()[gangName] then return groupNotFound('gang_not_found', gangName) end
    return core:SetActiveGang(source, gangName) == true
end

provide('AddPlayerToGang', addPlayerToGang)
provide('RemovePlayerFromGang', removePlayerFromGang)
provide('SetPlayerPrimaryGang', setPrimaryGang)
provide('SetGang', function(identifier, gangName, grade)
    local source, offline = resolve(identifier)
    if (not source and not offline) or type(gangName) ~= 'string' then return false end
    gangName = gangName:lower()
    local data = offline and offline.PlayerData or BridgeQB.getPlayer(source --[[@as integer]]).PlayerData
    if gangName == 'none' then
        local current = data.gang.name
        if current == 'none' then return true end
        return removePlayerFromGang(data.citizenid, current)
    end
    local ok, err = addPlayerToGang(data.citizenid, gangName, grade)
    if not ok then return false, err end
    -- A stored character's new gang is active when it has no other (ai-core's rule).
    if offline then return true end
    return setPrimaryGang(data.citizenid, gangName)
end)

provide('GetGroups', function(source)
    local player = BridgeQB.getPlayer(source)
    return player and BridgeQbox.groups(player.PlayerData) or {}
end)
provide('HasGroup', function(source, filter)
    local player = BridgeQB.getPlayer(source)
    return player ~= nil and BridgeQbox.hasGroup(filter, player.PlayerData)
end)
provide('HasPrimaryGroup', function(source, filter)
    local player = BridgeQB.getPlayer(source)
    return player ~= nil and BridgeQbox.hasGroup(filter, player.PlayerData, true)
end)

--- Every member of a job or gang, loaded or not (the QB bridge's walk over ai-core's paged members). Waits.
provide('GetGroupMembers', function(group, groupType)
    local out = {}
    for i, entry in ipairs(BridgeQB.groupMembers(groupType == 'gang' and 'gang' or 'job', group)) do
        out[i] = { citizenid = entry.citizenid, grade = entry.grade }
    end
    return out
end)
