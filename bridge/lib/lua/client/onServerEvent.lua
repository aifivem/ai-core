---Listens to a net event the server sends (a local emit by another resource is dropped). Arguments come from the
---server; a thrown error is printed with the event name.
---@param name string
---@param handler fun(...: any)
return function(name, handler)
    RegisterNetEvent(name, function(...)
        if source == nil or source == '' then return end
        local ok, err = pcall(handler, ...)
        if not ok then print(('^1[%s] event %s failed: %s^0'):format(GetCurrentResourceName(), name, err)) end
    end)
end
