-- QBCore.Commands through ai-lib's `addCommand` (QB levels are ai-core admins, `user` is everyone).

local playerId = BridgeQB.playerId

local t ---@type fun(key: string, ...: string|number): string

---@param source integer
---@param text string
local function reply(source, text)
    if source > 0 then Bridge.notify(source, text, 'error') else print(text) end
end

---@param source integer
---@param entry { name: string, permission: string|string[] }
---@return boolean
local function mayUse(source, entry)
    local permissions = type(entry.permission) == 'table' and entry.permission or { entry.permission }
    for _, permission in ipairs(permissions) do
        if permission == 'user' then return true end
    end
    return Bridge.isAdmin(source) or IsPlayerAceAllowed(tostring(source), 'command.' .. entry.name) or QBCore.Functions.HasPermission(source, permissions)
end

---@param name string
---@param help string
---@param arguments? { name: string, help: string }[]
---@param argsrequired? boolean
---@param callback fun(source: integer, args: string[], rawCommand: string)
---@param permission? string
---@param ... string more permission levels
function QBCore.Commands.Add(name, help, arguments, argsrequired, callback, permission, ...)
    if type(name) ~= 'string' or not name:match('^[%w_%-%.]+$') then return end
    arguments = type(arguments) == 'table' and arguments or {}
    local permissions = { type(permission) == 'string' and permission:lower() or 'user' }
    for _, extra in ipairs({ ... }) do
        if type(extra) == 'string' then permissions[#permissions + 1] = extra:lower() end
    end
    local restricted = permissions[1] ~= 'user'
    local aces = { 'ai.admin' }
    for _, level2 in ipairs(permissions) do
        if not QBCore.Commands.IgnoreList[level2] and level2:match('^[%w_%-]+$') then
            aces[#aces + 1] = level2
            ExecuteCommand(('add_ace qbcore.%s command.%s allow'):format(level2, name))
        end
    end
    aiLib.addCommand(name, { help = help, restricted = restricted and aces or false }, function(source, _, raw)
        local args = Bridge.words(raw)
        if argsrequired and #args < #arguments then
            t = t or aiLib.locale('ai-core')
            local missing = arguments[#args + 1]
            return reply(source, t('COMMAND_MISSING', type(missing) == 'table' and tostring(missing.name) or '?'))
        end
        TriggerEvent('QBCore:Server:PreCommandExecution', source, name, args, raw)
        if WasEventCanceled() then return end
        callback(source, args, raw)
    end)
    QBCore.Commands.List[name:lower()] = {
        name = name:lower(),
        permission = #permissions == 1 and permissions[1] or permissions,
        help = help,
        arguments = arguments,
        argsrequired = argsrequired == true,
        callback = callback,
    }
end

--- Sends a player the chat suggestions of the QB commands they may use and removes the others.
---@param source integer
function QBCore.Commands.Refresh(source)
    local id = playerId(source)
    if not id or not Bridge.players[id] then return end
    local suggestions = {}
    for command, entry in pairs(QBCore.Commands.List) do
        if mayUse(id, entry) then
            suggestions[#suggestions + 1] = { name = '/' .. command, help = entry.help, params = entry.arguments }
        else
            TriggerClientEvent('chat:removeSuggestion', id, '/' .. command)
        end
    end
    TriggerClientEvent('chat:addSuggestions', id, suggestions)
end

BridgeQB.mayUse = mayUse
