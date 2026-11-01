-- Same wire format as the TypeScript lib, so a Lua client and a TypeScript server (or the reverse) talk:
-- request `aicore:cb:<name>` (callerResource, id, ...args), answer `aicore:cbr:<callerResource>` (id, ok, result).
local resource = GetCurrentResourceName()
local pending = {}
-- Ids start far above the TypeScript lib's: a resource that bundles both (ai-core: TS lib + its Lua bridge) gets
-- both sides' answers on the same `aicore:cbr:<resource>` event, and equal ids would take each other's answers.
local nextId = 1 << 40

RegisterNetEvent(('aicore:cbr:%s'):format(resource), function(id, ok, result)
    local entry = pending[id]
    -- A server event carries a source; a local emit by another resource does not.
    if not entry or source == nil or source == '' then return end
    pending[id] = nil
    entry:resolve({ ok = ok == true, result = result })
end)

---Asks the server (`onClientCallback(name, ...)` there) and waits for its answer (call it from a thread). Returns the
---answer, or nil and an error text when the server refused, failed or did not answer within `timeout` ms (30000).
---@param name string
---@param args? any[]
---@param timeout? integer
---@return any result
---@return string? error
return function(name, args, timeout)
    nextId = nextId + 1
    local id = nextId
    local answer = promise.new()
    pending[id] = answer
    SetTimeout(timeout or 30000, function()
        if pending[id] then
            pending[id] = nil
            answer:resolve({ ok = false, timeout = true })
        end
    end)
    TriggerServerEvent(('aicore:cb:%s'):format(name), resource, id, table.unpack(args or {}))
    local reply = Citizen.Await(answer)
    if reply.ok then return reply.result end
    return nil, reply.timeout and 'timeout' or 'failed'
end
