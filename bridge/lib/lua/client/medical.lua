---The local player's down state through ai-core's medical layer, whatever death script runs: death scripts keep a
---downed ped alive to animate it, so `IsEntityDead` alone misses them. A memory read after the first call.
---@type boolean|nil ai-core's answer, kept from its local event; nil until first asked or after ai-core stops
local down = nil
AddEventHandler('ai-core:client:dead', function(value) down = value == true end)
AddEventHandler('onClientResourceStop', function(resource)
    if resource == 'ai-core' then down = nil end
end)

return {
    ---@return boolean
    isDead = function()
        if down == nil and GetResourceState('ai-core') == 'started' then down = exports['ai-core']:IsDead() == true end
        return down == true or IsEntityDead(aiLib.cache.ped)
    end,
    ---`fn(dead)` when the local player goes down or gets up.
    ---@param fn fun(dead: boolean)
    onChange = function(fn)
        AddEventHandler('ai-core:client:dead', function(value) fn(value == true) end)
    end,
}
