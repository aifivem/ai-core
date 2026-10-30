-- Qbox scripts include `@qbx_core/modules/playerdata.lua`; ai-core provides qbx_core, so the include resolves here.
-- It keeps the including resource's `QBX.PlayerData` current from ai-core's bridge (QBCore's client events).

---@diagnostic disable-next-line: lowercase-global
QBX = QBX or {}
QBX.PlayerData = exports.qbx_core:GetPlayerData() or {}

RegisterNetEvent('QBCore:Player:SetPlayerData', function(data)
    if GetInvokingResource() ~= 'ai-core' then return end
    QBX.PlayerData = data
end)

RegisterNetEvent('QBCore:Client:OnPlayerUnload', function()
    if GetInvokingResource() ~= 'ai-core' then return end
    QBX.PlayerData = {}
end)
