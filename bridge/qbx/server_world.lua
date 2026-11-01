-- Qbox on ai-core, server side: qbx_core's world and admin exports (routing buckets, vehicle and weapon lists,
-- vehicle classes, session ids, vehicle persistence flags, permissions, opt-in, bans) and the server half of
-- modules/lib.lua's `qbx.spawnVehicle` (the `initVehicle` bag).

local function provide(name, fn) Bridge.provideExport('qbx_core', name, fn) end

-- Routing buckets: one store with the QB bridge (`QBCore.Player_Buckets` / `Entity_Buckets`), so QB and Qbox scripts
-- see each other's moves; Qbox's `GetBucketObjects` shape (source / entity -> bucket) is built from it.

local F = QBCore.Functions

provide('SetPlayerBucket', function(source, bucket) return F.SetPlayerBucket(tonumber(source), tonumber(bucket)) end)
provide('SetEntityBucket', function(entity, bucket) return F.SetEntityBucket(tonumber(entity), tonumber(bucket)) end)
provide('GetPlayersInBucket', function(bucket) return F.GetPlayersInBucket(tonumber(bucket) or 0) end)
provide('GetEntitiesInBucket', function(bucket) return F.GetEntitiesInBucket(tonumber(bucket) or 0) end)
provide('GetBucketObjects', function()
    local players, entities = {}, {}
    for _, entry in pairs(QBCore.Player_Buckets) do players[entry.id] = entry.bucket end
    for _, entry in pairs(QBCore.Entity_Buckets) do entities[entry.id] = entry.bucket end
    return players, entities
end)

-- Vehicles and weapons (ai-core's copies of qbx_core's shared lists).

provide('GetVehiclesByName', BridgeQbox.vehiclesByName)
provide('GetVehiclesByHash', BridgeQbox.vehiclesByHash)
provide('GetVehiclesByCategory', BridgeQbox.vehiclesByCategory)
provide('GetWeapons', BridgeQbox.weapons)
--- Deprecated in Qbox, whose own list is empty.
provide('GetLocations', function() return {} end)

--- Vehicle classes come from a client (the native is client-only), asked once per model and kept.
---@type table<integer, integer>
local vehicleClasses = {}

provide('GetVehicleClass', function(model)
    local hash = type(model) == 'string' and GetHashKey(model) or math.tointeger(tonumber(model))
    if not hash then return nil end
    local known = vehicleClasses[hash]
    if known then return known end
    -- Up to three loaded players are asked, picked before waiting (the player list may change meanwhile).
    local askers = {}
    for source in pairs(Bridge.players) do
        askers[#askers + 1] = source
        if #askers >= 3 then break end
    end
    for _, source in ipairs(askers) do
        local class = math.tointeger(tonumber(aiLib.triggerClientCallback('ai-core:qbxVehicleClass', source, { hash }, 5000)))
        if class and class >= 0 and class <= 22 then
            vehicleClasses[hash] = class
            return class
        end
    end
    return nil
end)

---@type integer
local sessionIds = 0

--- A `sessionId` bag on the entity, kept when it has one (Qbox's CreateSessionId).
provide('CreateSessionId', function(entity)
    local state = Entity(entity).state
    if state.sessionId then return state.sessionId end
    sessionIds = sessionIds + 1
    state:set('sessionId', sessionIds, true)
    return sessionIds
end)

--- Qbox's persistence flag (`persisted` bag). ai-core keeps no Qbox vehicle persistence: the flag is only set.
---@param vehicle integer
local function disablePersistence(vehicle)
    if DoesEntityExist(vehicle) then Entity(vehicle).state:set('persisted', nil, true) end
end

provide('EnablePersistence', function(vehicle)
    if DoesEntityExist(vehicle) then Entity(vehicle).state:set('persisted', true, true) end
end)
provide('DisablePersistence', disablePersistence)
provide('DeleteVehicle', function(vehicle)
    disablePersistence(vehicle)
    if DoesEntityExist(vehicle) then DeleteEntity(vehicle) end
end)

-- qbx.spawnVehicle (modules/lib.lua) sets `initVehicle` for the clients to clear the seats and place the vehicle; the
-- clients cannot clear a bag here (sv_stateBagStrictMode), so the server does once they had it.
AddStateBagChangeHandler('initVehicle', '', function(bagName, _, value)
    if value ~= true then return end
    local entity = GetEntityFromStateBagName(bagName)
    if entity == 0 then return end
    SetTimeout(3000, function()
        if DoesEntityExist(entity) and Entity(entity).state.initVehicle then Entity(entity).state:set('initVehicle', nil, true) end
    end)
end)

-- Permissions: ACE. Qbox's levels (`god`, `admin`, `mod`) also count for ai-core admins (`ai.admin`).

local LEVELS = { 'god', 'admin', 'mod' }
local ADMIN_LEVEL = { god = true, admin = true, mod = true }

---@param source integer
---@param permission string
---@return boolean
local function allowed(source, permission)
    if type(permission) ~= 'string' then return false end
    return IsPlayerAceAllowed(tostring(source), permission) or (ADMIN_LEVEL[permission] == true and aiLib.isAdmin(source))
end

---@param source integer
local function permissionChanged(source)
    TriggerClientEvent('QBCore:Client:OnPermissionUpdate', source)
    TriggerEvent('QBCore:Server:OnPermissionUpdate', source)
end

---@param permission any
---@return boolean
local function validGroup(permission)
    return type(permission) == 'string' and permission:match('^[%w_%-%.]+$') ~= nil
end

--- Deprecated in Qbox (use cfg ACEs): adds the player to `group.<permission>` for this session.
provide('AddPermission', function(source, permission)
    source = math.tointeger(tonumber(source))
    if not source or not validGroup(permission) or allowed(source, permission) then return end
    ExecuteCommand(('add_principal player.%d group.%s'):format(source, permission))
    permissionChanged(source)
end)

--- Deprecated in Qbox: removes `group.<permission>` (every Qbox level without one).
provide('RemovePermission', function(source, permission)
    source = math.tointeger(tonumber(source))
    if not source then return end
    if permission ~= nil then
        if not validGroup(permission) or not IsPlayerAceAllowed(tostring(source), permission) then return end
        ExecuteCommand(('remove_principal player.%d group.%s'):format(source, permission))
        permissionChanged(source)
        return
    end
    local changed = false
    for _, level in ipairs(LEVELS) do
        if IsPlayerAceAllowed(tostring(source), level) then
            ExecuteCommand(('remove_principal player.%d group.%s'):format(source, level))
            changed = true
        end
    end
    if changed then permissionChanged(source) end
end)

provide('HasPermission', function(source, permission)
    if type(permission) == 'table' then
        for _, level in pairs(permission) do
            if allowed(source, level) then return true end
        end
        return false
    end
    return allowed(source, permission)
end)

provide('GetPermission', function(source)
    local out = {}
    for _, level in ipairs(LEVELS) do
        if allowed(source, level) then out[level] = true end
    end
    return out
end)

--- ai-core has no whitelist of its own (refusals go through its connection gate).
provide('IsWhitelisted', function() return true end)

--- Admin reports opt-in: the QB bridge's (metadata `optin`, admins only).
provide('IsOptin', function(source) return QBCore.Functions.IsOptin(source) end)
provide('ToggleOptin', function(source) QBCore.Functions.ToggleOptin(source) end)

--- Deprecated in Qbox (its QB layer's SetField): the QB bridge's.
provide('SetField', function(fieldName, data) return QBCore.Functions.SetField(fieldName, data) end)

--- ai-core keeps no ban list: nobody counts as banned.
provide('IsPlayerBanned', function() return false end)

local t = aiLib.locale('ai-core')

--- Drops the player and logs it (ai-core stores no ban, so the player can join again).
provide('ExploitBan', function(source, origin)
    source = math.tointeger(tonumber(source))
    if not source or not GetPlayerName(source) then return end
    aiLib.aiLog('anticheat', ('Dropped for exploiting: %s'):format(tostring(origin)), { level = 'warn', source = source, metadata = { by = GetInvokingResource() } })
    DropPlayer(tostring(source), t('BRIDGE_EXPLOIT_DROPPED'))
end)
