-- Qbox on ai-core, client side: `exports.qbx_core:GetPlayerData()` / `Notify()` and the `QBX.PlayerData` global
-- Qbox scripts read after including `@qbx_core/modules/playerdata.lua` (that file is ai-core's modules/playerdata.lua).

local function provide(name, fn) BridgeClient.provideExport('qbx_core', name, fn) end

provide('GetPlayerData', function() return BridgeQBClient.getPlayerData() end)
provide('Notify', function(text, kind, duration) BridgeClient.notify(text, kind, duration) end)
provide('IsLoggedIn', function() return BridgeClient.loaded end)
provide('GetGroups', function()
    local data = BridgeQBClient.getPlayerData()
    local out = {}
    if data.job then out[data.job.name] = data.job.grade.level end
    if data.gang and data.gang.name ~= 'none' then out[data.gang.name] = data.gang.grade.level end
    return out
end)
provide('HasPrimaryGroup', function(filter)
    local data = BridgeQBClient.getPlayerData()
    if not data.job then return end
    local groups = { [data.job.name] = data.job.grade.level }
    if data.gang and data.gang.name ~= 'none' then groups[data.gang.name] = data.gang.grade.level end
    if type(filter) == 'string' then
        if groups[filter] then return filter, groups[filter] end
        return
    end
    for key, value in pairs(filter) do
        local name, min = tostring(type(key) == 'number' and value or key), type(key) == 'number' and 0 or value
        if groups[name] and groups[name] >= min then return name, groups[name] end
    end
end)
