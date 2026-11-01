local resource = GetCurrentResourceName()
local pending = {}
-- Ids start far above the TypeScript lib's: a resource that bundles both (ai-core: TS lib + its Lua bridge) gets
-- both sides' answers on the same `aicore:cbr:<resource>` event, and equal ids would take each other's answers.
local nextId = 1 << 40

RegisterNetEvent(('aicore:cbr:%s'):format(resource), function(id, ok, result)
    local entry = pending[id]
    -- Only the player we asked may answer.
    if not entry or entry.source ~= source then return end
    pending[id] = nil
    entry.answer:resolve({ ok = ok == true, result = result })
end)

---Asks one player's client (`onServerCallback(name, ...)` there) and waits for the answer (call it from a thread).
---Returns the answer, or nil and an error text when it failed or did not come within `timeout` ms (30000).
---The answer comes from a client: check it.
---@param name string
---@param src integer
---@param args? any[]
---@param timeout? integer
---@return any result
---@return string? error
return function(name, src, args, timeout)
    nextId = nextId + 1
    local id = nextId
    local answer = promise.new()
    pending[id] = { source = src, answer = answer }
    SetTimeout(timeout or 30000, function()
        if pending[id] then
            pending[id] = nil
            answer:resolve({ ok = false, timeout = true })
        end
    end)
    TriggerClientEvent(('aicore:cb:%s'):format(name), src, resource, id, table.unpack(args or {}))
    local reply = Citizen.Await(answer)
    if reply.ok then return reply.result end
    return nil, reply.timeout and 'timeout' or 'failed'
end
