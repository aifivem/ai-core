-- ESX on ai-core, client UI: the esx_* UI resources' exports and events (ai-core provides their names).

---@param name string
---@param export string
---@param fn function
local function provide(name, export, fn) BridgeClient.provideExport(name, export, fn) end

provide('esx_context', 'Open', function(...) return ESX.OpenContext(...) end)
provide('esx_context', 'Preview', function() return ESX.PreviewContext() end)
provide('esx_context', 'Close', function() return ESX.CloseContext() end)
provide('esx_context', 'Refresh', function(...) return ESX.RefreshContext(...) end)
provide('esx_context', 'focusPreview', function() end)
provide('esx_textui', 'TextUI', function(...) return ESX.TextUI(...) end)
provide('esx_textui', 'HideUI', function() return ESX.HideUI() end)
provide('esx_notify', 'Notify', function(kind, length, message, title) BridgeClient.notify(message or '', kind, length, title) end)
provide('esx_progressbar', 'Progressbar', function(...) return ESX.Progressbar(...) end)
provide('esx_progressbar', 'CancelProgressbar', function() return ESX.CancelProgressbar() end)

RegisterNetEvent('ESX:TextUI', function(message, kind) ESX.TextUI(message, kind) end)
RegisterNetEvent('ESX:HideUI', function() ESX.HideUI() end)
RegisterNetEvent('ESX:Notify', function(kind, length, message, title) BridgeClient.notify(message or '', kind, length, title) end)
RegisterNetEvent('esx:showAdvancedNotification', function(...) ESX.ShowAdvancedNotification(...) end)
RegisterNetEvent('esx:showHelpNotification', function(msg, thisFrame, beep, duration) ESX.ShowHelpNotification(msg, thisFrame, beep, duration) end)
aiLib.onServerEvent('esx:showInventoryItemNotification', function(add, item, count)
    if type(add) ~= 'boolean' or type(item) ~= 'string' then return end
    ESX.UI.ShowInventoryItemNotification(add, item, tonumber(count) or 1)
end)
