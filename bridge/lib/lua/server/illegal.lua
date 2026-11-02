---A character's legal / illegal status through ai-core (metadata `illegal`), like the TypeScript lib's `illegal`.
---Always legal while ai-core's panel switch `illegal.enabled` is off.
local core = exports['ai-core']

return {
    ---Whether a loaded player's character is illegal (false when not loaded).
    ---@param src integer
    ---@return boolean
    is = function(src)
        local ok, value = pcall(function() return core:IsIllegal(src) end)
        return ok and value == true
    end,
    ---Any character by citizenid or `{ charId = id }`, loaded or not; nil when unknown. Waits for a stored one.
    ---@param target string|{ charId: integer }
    ---@return boolean?
    of = function(target)
        local p = promise.new()
        local ok, now = pcall(function()
            return core:IsIllegal(target, function(value) p:resolve(value) end)
        end)
        if not ok then return nil end
        if now ~= nil then return now end
        return Citizen.Await(p)
    end,
    ---Marks a character illegal or legal, loaded or not: `{ ok = true }` or `{ ok = false, error = <lang key> }`. Waits.
    ---@param target integer|string|{ charId: integer }
    ---@param state boolean
    ---@return { ok: boolean, error?: string }
    set = function(target, state)
        local p = promise.new()
        local ok = pcall(function()
            core:SetIllegal(target, state, function(result) p:resolve(result) end)
        end)
        if not ok then return { ok = false, error = 'CORE_ERR_ARGS' } end
        return Citizen.Await(p)
    end,
}
