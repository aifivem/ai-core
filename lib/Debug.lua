-- vRP's lib/Debug.lua on ai-core: debugging stays off (ai-core logs through its own channels). Same fields as
-- vRP 1.0's Debug (https://github.com/vRP-framework/vRP, MIT) so scripts that touch it keep working.

local Debug = { active = false, async_time = 2, maxlen = 75 }

function Debug.log(_str, _no_limit) end

---@return nil
function Debug.pbegin(_str) return nil end

function Debug.pend(_id) end

--- Copy of a table without userdata.
---@param t any
---@return any
function Debug.safeTableCopy(t)
    if type(t) ~= 'table' then return t end
    local r = {}
    for k, v in pairs(t) do
        if type(v) ~= 'userdata' then r[k] = Debug.safeTableCopy(v) end
    end
    return r
end

return Debug
