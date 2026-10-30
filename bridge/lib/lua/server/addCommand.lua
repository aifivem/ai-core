-- Server commands the same way as the TypeScript lib's `addCommand`: parsed params, the permission checked with ACE,
-- chat suggestions only for players allowed to use them, and the command listed in ai-core's panel.

local resource = GetCurrentResourceName()
local commands = {}
local sent = {}
local announced = 0
local queued = false
local listening = false
local t

---@param src integer
---@param text string
---@param kind string
local function reply(src, text, kind)
    if src > 0 then aiLib.notify(src, text, kind) else print(text) end
end

---@param src integer
---@param command table
---@param name string
local function allowed(src, command, name)
    if src <= 0 or not command.aces then return true end
    for _, ace in ipairs(command.aces) do
        if IsPlayerAceAllowed(tostring(src), ace) then return true end
    end
    return IsPlayerAceAllowed(tostring(src), 'command.' .. name)
end

---Sends `src` the suggestions they gained and removes the ones they lost.
---@param src integer
local function refresh(src)
    local before = sent[src] or {}
    local now, add = {}, {}
    for _, command in ipairs(commands) do
        for _, name in ipairs(command.names) do
            if allowed(src, command, name) then
                now[name] = true
                if not before[name] then
                    local params = {}
                    for i, p in ipairs(command.params) do params[i] = { name = p.name, help = p.help or '' } end
                    add[#add + 1] = { name = '/' .. name, help = command.help, params = params }
                end
            end
        end
    end
    sent[src] = now
    if #add > 0 then TriggerClientEvent('chat:addSuggestions', src, add) end
    for name in pairs(before) do
        if not now[name] then TriggerClientEvent('chat:removeSuggestion', src, '/' .. name) end
    end
end

local function listen()
    listening = true
    AddEventHandler('ai-core:playerLoaded', refresh)
    -- Job and gang grades are ACL principals: a command restricted to `ai.job.police` follows them.
    AddEventHandler('ai-core:jobsChanged', refresh)
    AddEventHandler('ai-core:gangsChanged', refresh)
    AddEventHandler('playerDropped', function() sent[source] = nil end)
    AddEventHandler('onResourceStop', function(name)
        if name ~= resource then return end
        for _, command in ipairs(commands) do
            for _, n in ipairs(command.names) do TriggerClientEvent('chat:removeSuggestion', -1, '/' .. n) end
        end
    end)
end

local function flush()
    queued = false
    local infos = {}
    for i = announced + 1, #commands do
        local c = commands[i]
        infos[#infos + 1] = { names = c.names, help = c.help, params = c.params, aces = c.aces }
    end
    announced = #commands
    if GetResourceState('ai-core') == 'started' then exports['ai-core']:RegisterCommands(resource, infos) end
    for _, player in ipairs(GetPlayers()) do refresh(tonumber(player) --[[@as integer]]) end
end

---@param command table
---@param raw string[]
---@return table|string args by param name, or the error text
local function parse(command, raw)
    local args = {}
    for i, param in ipairs(command.params) do
        local token = param.type == 'longString' and table.concat(raw, ' ', i) or (raw[i] or '')
        if token == '' then
            if not param.optional then return t('COMMAND_MISSING', param.name) end
        elseif param.type == 'number' or param.type == 'playerId' then
            local value = tonumber(token)
            if not value then return t('COMMAND_NUMBER', param.name) end
            if param.type == 'playerId' and (math.type(value) ~= 'integer' or value <= 0 or not GetPlayerName(value)) then
                return t('COMMAND_PLAYER', token)
            end
            args[param.name] = value
        else
            args[param.name] = token
        end
        if param.type == 'longString' then break end
    end
    return args
end

---@class AiLibCommandParam
---@field name string
---@field type 'number'|'playerId'|'string'|'longString'
---@field help? string lang text
---@field optional? boolean

---Registers a server command (a list of names adds aliases). `restricted`: false (everyone), true (ai-core admins,
---ace `ai.admin`), an ace / principal or a list of them. The handler gets `(source, args, rawLine)`; source 0 is the
---server console. Wrong input shows the error and the usage line to the player.
---@param name string|string[]
---@param options { help?: string, params?: AiLibCommandParam[], restricted?: boolean|string|string[] }
---@param handler fun(source: integer, args: table, raw: string)
return function(name, options, handler)
    t = t or aiLib.locale('ai-core')
    local names = type(name) == 'table' and name or { name }
    for i, n in ipairs(names) do names[i] = n:lower() end
    local restricted = options.restricted or false
    local aces = restricted == false and nil
        or restricted == true and { 'ai.admin' }
        or type(restricted) == 'table' and restricted
        or { restricted }
    local params = options.params or {}
    local usage = { '/' .. names[1] }
    for _, p in ipairs(params) do usage[#usage + 1] = p.optional and ('[%s]'):format(p.name) or ('<%s>'):format(p.name) end
    local command = { names = names, help = options.help or '', params = params, aces = aces, usage = table.concat(usage, ' ') }
    for _, n in ipairs(names) do
        RegisterCommand(n, function(src, raw, line)
            if not allowed(src, command, n) then return reply(src, t('COMMAND_NOT_ALLOWED'), 'error') end
            local args = parse(command, raw)
            if type(args) == 'string' then
                reply(src, args, 'error')
                return reply(src, t('COMMAND_USAGE', command.usage), 'info')
            end
            local ok, err = pcall(handler, src, args, line)
            if not ok then print(('^1[%s] command /%s failed: %s^0'):format(resource, n, err)) end
        end, false)
    end
    commands[#commands + 1] = command
    if not listening then listen() end
    if not queued then
        queued = true
        SetTimeout(0, flush)
    end
end
