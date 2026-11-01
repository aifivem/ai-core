-- QBCore.Functions.HasItem on the client.

local F = QBCore.Functions

--- `HasItem('bread')`, `HasItem({ 'bread', 'water' }, 2)` (each) or `HasItem({ bread = 2, water = 1 })`.
---@param items string|string[]|table<string, integer>
---@param amount? integer
---@return boolean
function F.HasItem(items, amount)
    local core = exports['ai-core']
    if type(items) == 'string' then return core:HasItem(items, amount or 1) == true end
    if type(items) ~= 'table' then return false end
    for key, value in pairs(items) do
        local name, count = key, value
        if type(key) == 'number' then name, count = value, amount or 1 end
        if not core:HasItem(tostring(name), tonumber(count) or 1) then return false end
    end
    return true
end
