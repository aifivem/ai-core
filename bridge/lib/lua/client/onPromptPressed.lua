local resource = GetCurrentResourceName()

---Runs `handler(id)` when the player presses the interaction key while this resource's prompt `id` is on top.
---@param handler fun(id: string)
return function(handler)
    AddEventHandler('ai-lib:client:promptPressed', function(owner, id)
        if owner == resource and type(id) == 'string' then handler(id) end
    end)
end
