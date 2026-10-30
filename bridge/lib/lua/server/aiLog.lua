---Logs through ai-core (its panel picks console, Discord, Fivemanage...). Pass `source` / `target` instead of names
---in the message; values go into `metadata`.
---@param channel string
---@param message string
---@param options? { level?: 'debug'|'info'|'warn'|'error', source?: integer, target?: integer, metadata?: table }
return function(channel, message, options)
    if GetResourceState('ai-core') ~= 'started' then return print(('[%s] %s'):format(channel, message)) end
    exports['ai-core']:Log(channel, message, options or {})
end
