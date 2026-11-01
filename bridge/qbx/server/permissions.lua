-- qbx_core's permission, opt-in, whitelist and ban exports.

local provide = BridgeQbox.provide

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

--- ai-core's ban list (the QB bridge's IsPlayerBanned: `true, message` or false).
provide('IsPlayerBanned', function(source) return QBCore.Functions.IsPlayerBanned(source) end)

--- A permanent ban in ai-core's ban list with the origin as reason (the QB bridge's ExploitBan).
provide('ExploitBan', function(source, origin) BridgeQB.exploitBan(source, origin) end)
