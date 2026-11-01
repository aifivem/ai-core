-- qbx_core's server events and player state bags from ai-core's changes; they keep the indexes and Qbox's PlayerData
-- fields current.

local core = Bridge.core
local byIdentifier, identifiersOf, byUserId, userIds = BridgeQbox.byIdentifier, BridgeQbox.identifiersOf, BridgeQbox.byUserId, BridgeQbox.userIds
local metaBefore, jobMap, gangMap, extendPlayer = BridgeQbox.metaBefore, BridgeQbox.jobMap, BridgeQbox.gangMap, BridgeQbox.extendPlayer

--- Player state bags Qbox scripts read (`LocalPlayer.state.isLoggedIn`, `hunger` / `thirst` / `stress`), set by the
--- server only (sv_stateBagStrictMode).
local NEEDS = { hunger = true, thirst = true, stress = true }

Bridge.on('loaded', function(source)
    local mirror = Bridge.players[source]
    local name = tostring(source)
    local list = {}
    for i = 0, GetNumPlayerIdentifiers(name) - 1 do
        local identifier = GetPlayerIdentifier(name, i)
        if identifier then
            list[#list + 1] = identifier
            byIdentifier[identifier] = source
        end
    end
    identifiersOf[source] = list
    local userId = core:GetUserId(source)
    if userId then
        userIds[source], byUserId[userId] = userId, source
    end
    local before = {}
    for key, value in pairs(mirror.metadata) do before[key] = value end
    metaBefore[source] = before
    extendPlayer(source)
    local player = BridgeQB.getPlayer(source)
    local metadata = player and player.PlayerData.metadata or mirror.metadata
    local state = Player(source).state
    for key in pairs(NEEDS) do
        local value = tonumber(metadata[key])
        if value then state:set(key, value, true) end
    end
    state:set('isLoggedIn', true, true)
end)

Bridge.on('unloaded', function(source, reason)
    for _, identifier in ipairs(identifiersOf[source] or {}) do
        if byIdentifier[identifier] == source then byIdentifier[identifier] = nil end
    end
    identifiersOf[source] = nil
    local userId = userIds[source]
    if userId and byUserId[userId] == source then byUserId[userId] = nil end
    userIds[source], metaBefore[source] = nil, nil
    if reason == 'switch' then
        Player(source).state:set('isLoggedIn', false, true)
        -- After the bridge dropped the player, as qbx_core's Logout does.
        SetTimeout(0, function() TriggerEvent('qbx_core:server:playerLoggedOut', source) end)
    end
end)

--- Membership changes as qbx_core's onGroupUpdate (name, grade; no grade = removed).
---@param source integer
---@param before table<string, integer>
---@param after table<string, integer>
local function groupUpdates(source, before, after)
    for name, grade in pairs(after) do
        if before[name] ~= grade then TriggerEvent('qbx_core:server:onGroupUpdate', source, name, grade) end
    end
    for name in pairs(before) do
        if after[name] == nil then TriggerEvent('qbx_core:server:onGroupUpdate', source, name) end
    end
end

Bridge.on('job', function(source)
    local player, mirror = BridgeQB.getPlayer(source), Bridge.players[source]
    if not player or not mirror then return end
    local data = player.PlayerData --[[@as table]]
    data.job.bankAuth = data.job.isboss == true
    local after = jobMap(mirror)
    groupUpdates(source, data.jobs or {}, after)
    data.jobs = after
end)

Bridge.on('gang', function(source)
    local player, mirror = BridgeQB.getPlayer(source), Bridge.players[source]
    if not player or not mirror then return end
    local data = player.PlayerData --[[@as table]]
    data.gang.bankAuth = data.gang.isboss == true
    local after = gangMap(mirror)
    groupUpdates(source, data.gangs or {}, after)
    data.gangs = after
end)

Bridge.on('meta', function(source, key, value)
    local before = metaBefore[source]
    if not before then return end
    local old = before[key]
    before[key] = value
    local player = BridgeQB.getPlayer(source)
    if player and value == nil then
        local default = BridgeQbox.metaDefaults()[key]
        if default ~= nil then player.PlayerData.metadata[key] = default end
    end
    local state = Player(source).state
    if NEEDS[key] and tonumber(value) and state[key] ~= value then state:set(key, tonumber(value), true) end
    if key == 'isdead' or key == 'inlaststand' then state:set('canUseWeapons', not value, true) end
    TriggerEvent('qbx_core:server:onSetMetaData', key, old, value, source)
end)
