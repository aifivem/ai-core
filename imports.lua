-- ESX's import for scripts that include '@es_extended/imports.lua' (ai-core provides es_extended, so the include
-- resolves here): the `ESX` global from ai-core's bridge, kept current on the client from the bridge's ESX events.

---@diagnostic disable-next-line: lowercase-global
ESX = exports['es_extended']:getSharedObject()
ESX.currentResourceName = GetCurrentResourceName()

if not IsDuplicityVersion() then
    RegisterNetEvent('esx:playerLoaded', function(xPlayer, _isNew)
        if GetInvokingResource() ~= 'ai-core' then return end
        ESX.PlayerData = xPlayer
        ESX.PlayerLoaded = true
    end)

    RegisterNetEvent('esx:onPlayerLogout', function()
        if GetInvokingResource() ~= 'ai-core' then return end
        ESX.PlayerLoaded = false
        ESX.PlayerData = {}
    end)

    AddEventHandler('esx:setPlayerData', function(key, value)
        if GetInvokingResource() ~= 'ai-core' then return end
        ESX.PlayerData[key] = value
    end)

    RegisterNetEvent('esx:setJob', function(job, _lastJob)
        if GetInvokingResource() ~= 'ai-core' then return end
        ESX.PlayerData.job = job
    end)
end
