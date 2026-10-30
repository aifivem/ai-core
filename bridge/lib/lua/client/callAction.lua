-- This resource's lang table, read on the first refusal.
local texts

---Runs an action on the server (an `onClientCallback` answering `{ ok = true, ... }` or `{ ok = false, error = key }`)
---and waits (call it from a thread). A refusal, a timeout or a gate refusal shows the error's text from this
---resource's lang file as an error notification (`fallback` when the reply has no error). Returns the ok reply or nil.
---@param name string
---@param args? any[]
---@param options { fallback: string, timeout?: integer, silent?: boolean }
---@return table?
return function(name, args, options)
    local reply = aiLib.triggerServerCallback(name, args, options.timeout)
    if type(reply) == 'table' and reply.ok == true then return reply end
    if not options.silent then
        local key = type(reply) == 'table' and type(reply.error) == 'string' and reply.error ~= '' and reply.error
            or options.fallback
        if not texts then
            local _, all = aiLib.locale()
            texts = all
        end
        aiLib.notify(texts[key] or key, 'error')
    end
    return nil
end
