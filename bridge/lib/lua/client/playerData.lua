-- ai-core's per-player data on this client (character, money, jobs, duty, gangs, activeGang): one snapshot, then
-- changes, the same channel the TypeScript lib's `onPlayerData` reads.

local values = {}
local handlers = {}

local function deliver(key, value)
    values[key] = value
    for _, handler in ipairs(handlers[key] or {}) do handler(value) end
end

RegisterNetEvent('ai-core:client:playerData', function(key, value)
    if source == nil or source == '' or type(key) ~= 'string' then return end
    deliver(key, value)
end)
RegisterNetEvent('ai-core:client:playerDataPatch', function(key, patch)
    if source == nil or source == '' or type(key) ~= 'string' or type(patch) ~= 'table' then return end
    local merged = {}
    for k, v in pairs(values[key] or {}) do merged[k] = v end
    for k, v in pairs(patch) do merged[k] = v end
    deliver(key, merged)
end)

local playerData = {}

---The last value of `key` (asks ai-core once when nothing arrived since this resource started).
---@param key 'character'|'money'|'jobs'|'duty'|'gangs'|'activeGang'
---@return any
function playerData.get(key)
    if values[key] == nil then
        local data = exports['ai-core']:GetPlayerData()
        if type(data) == 'table' then values[key] = data[key] end
    end
    return values[key]
end

---Runs `handler(value)` each time ai-core pushes `key` for this player.
---@param key 'character'|'money'|'jobs'|'duty'|'gangs'|'activeGang'
---@param handler fun(value: any)
function playerData.onChange(key, handler)
    handlers[key] = handlers[key] or {}
    table.insert(handlers[key], handler)
end

return playerData
