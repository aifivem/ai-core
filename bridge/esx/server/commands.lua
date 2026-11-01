-- ESX on ai-core, server side: ESX.RegisterCommand on ai-lib's commands.

local getPlayerFromId = BridgeESX.getPlayerFromId

---@param name string|string[]
---@param group string|string[]
---@param cb fun(xPlayer: xPlayer|false, args: table, showError: fun(msg: string))
---@param allowConsole? boolean
function ESX.RegisterCommand(name, group, cb, allowConsole)
    aiLib.addCommand(name, { restricted = group ~= 'user' }, function(source, _, raw)
        if source == 0 and not allowConsole then return end
        cb(source ~= 0 and getPlayerFromId(source) or false, Bridge.words(raw), function(msg) Bridge.notify(source, msg, 'error') end)
    end)
end
