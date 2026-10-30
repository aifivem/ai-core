---Answers the server's `triggerClientCallback(name, source, ...)`; the handler's return value is sent back (an error
---answers a failure). Arguments come from the server: still check them.
---@param name string
---@param handler fun(...: any): any
return function(name, handler)
    RegisterNetEvent(('aicore:cb:%s'):format(name), function(caller, id, ...)
        if source == nil or source == '' or type(caller) ~= 'string' or type(id) ~= 'number' then return end
        local ok, result = pcall(handler, ...)
        if not ok then print(('^1[%s] callback %s failed: %s^0'):format(GetCurrentResourceName(), name, result)) end
        TriggerServerEvent(('aicore:cbr:%s'):format(caller), id, ok, ok and result or nil)
    end)
end
