-- ESX on ai-core, both sides: ESX.Await and ESX's timeouts, copied from es_extended 1.12.4 / 1.16.3 (GPL-3.0).

--- Calls `conditionFunc` every frame until it answers a truthy value or `timeoutMs` (default 1000) passes.
---@param conditionFunc function
---@param errorMessage? string
---@param timeoutMs? integer
---@return boolean, any
function ESX.Await(conditionFunc, errorMessage, timeoutMs)
    timeoutMs = timeoutMs or 1000
    if not ESX.IsFunctionReference(conditionFunc) then error('Condition Function should be a function reference.') end
    local invoker = GetInvokingResource()
    local result = aiLib.waitFor(function() return conditionFunc() or nil end, timeoutMs)
    if result then return true, result end
    if errorMessage then error(('[%s] -> %s'):format(invoker, errorMessage)) end
    return false
end

local timeoutCount = 0
---@type table<integer, boolean>
local cancelledTimeouts = {}

---@param msec integer
---@param cb function
---@return integer
function ESX.SetTimeout(msec, cb)
    timeoutCount = timeoutCount + 1
    local id = timeoutCount
    SetTimeout(msec, function()
        if cancelledTimeouts[id] then
            cancelledTimeouts[id] = nil
            return
        end
        cb()
    end)
    return id
end

---@param id integer
function ESX.ClearTimeout(id) cancelledTimeouts[id] = true end
