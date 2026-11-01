-- vRP 1 group events: `vRP:playerJoinGroup` / `vRP:playerLeaveGroup (user_id, group, gtype)` from the difference of
-- the character's groups after each job, gang or extra group change (also changes ai-core makes itself).

local META_KEY, groupSet = BridgeVRP.groupMetaKey, BridgeVRP.groupSet
local indexRules, permissionFunctions = BridgeVRP.indexRules, BridgeVRP.permissionFunctions

---@type table<integer, table<string, string|false>>
local known = {}

---@param source integer
---@param silent? boolean only take the current set (load, mapping change)
local function diffGroups(source, silent)
    local mirror = Bridge.players[source]
    if not mirror then return end
    local now = groupSet(mirror, source)
    local before = known[source]
    known[source] = now
    if silent or not before then return end
    local id = mirror.character.id
    for name, gtype in pairs(before) do
        if now[name] == nil then TriggerEvent('vRP:playerLeaveGroup', id, name, gtype or nil) end
    end
    for name, gtype in pairs(now) do
        if before[name] == nil then TriggerEvent('vRP:playerJoinGroup', id, name, gtype or nil) end
    end
end

Bridge.on('loaded', function(source) diffGroups(source, true) end)
Bridge.on('unloaded', function(source) known[source] = nil end)
Bridge.on('job', function(source) diffGroups(source) end)
Bridge.on('gang', function(source) diffGroups(source) end)
Bridge.on('meta', function(source, key)
    if key == META_KEY then diffGroups(source) end
end)

BridgeVRP.onConfig(function(config)
    indexRules(config)
    for source in pairs(Bridge.players) do diffGroups(source, true) end
end)

AddEventHandler('onResourceStop', function(resource)
    for name, entry in pairs(permissionFunctions) do
        if entry.owner == resource then permissionFunctions[name] = nil end
    end
end)

-- Characters already loaded when the bridge starts (ai-core restart): take their groups without events.
CreateThread(function()
    Wait(1500)
    for source in pairs(Bridge.players) do
        if not known[source] then diffGroups(source, true) end
    end
end)
