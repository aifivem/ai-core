-- Permissions (QB levels god / admin / mod are ai-core admins, ace `ai.admin`; QB-style aces still count), admin
-- opt-in, bans, whitelist and kicks.

local core = Bridge.core
local getPlayer, playerId = BridgeQB.getPlayer, BridgeQB.playerId

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

BridgeQB.granted = granted
