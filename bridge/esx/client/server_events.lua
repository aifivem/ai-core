-- ESX on ai-core, client events: the player data events the server sends (es_extended client/modules/player/
-- lifecycle.lua, GPL-3.0). Server events go through `aiLib.onServerEvent`: a local emit by another resource is
-- dropped, so nothing here runs without the server asking.

local ESX = ESX --[[@as ESXClient]]

aiLib.onServerEvent('esx:setMaxWeight', function(maxWeight) ESX.SetPlayerData('maxWeight', maxWeight) end)
aiLib.onServerEvent('esx:setInventory', function(inventory)
    if type(inventory) == 'table' then ESX.SetPlayerData('inventory', inventory) end
end)
aiLib.onServerEvent('esx:setGroup', function(group) ESX.SetPlayerData('group', group) end)
aiLib.onServerEvent('esx:updatePlayerData', function(key, value)
    if type(key) == 'string' then ESX.SetPlayerData(key, value) end
end)
aiLib.onServerEvent('esx:registerSuggestions', function(commands)
    if type(commands) ~= 'table' then return end
    for name, command in pairs(commands) do
        if type(command) == 'table' and command.suggestion then
            TriggerEvent('chat:addSuggestion', ('/%s'):format(name), command.suggestion.help, command.suggestion.arguments)
        end
    end
end)
aiLib.onServerEvent('esx:executeCommand', function(command)
    if type(command) == 'string' and command:find('%S') then ExecuteCommand(command) end
end)
aiLib.onServerEvent('esx:requestModel', function(model) aiLib.requestModel(model) end)
