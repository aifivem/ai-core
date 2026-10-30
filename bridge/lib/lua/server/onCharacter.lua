---A loaded character's lifecycle from ai-core's events: `loaded(src, character)` also runs once (next tick) for every
---character already in the world when this resource (re)starts; `unloaded(src, charId)` on logout, character switch
---and drop (each `loaded` gets exactly one). No extra playerDropped handler is needed next to it.
---@param handlers { loaded?: fun(src: integer, character: table), unloaded?: fun(src: integer, charId: integer) }
return function(handlers)
    local resource = GetCurrentResourceName()
    ---@type table<integer, integer> src -> charId of each `loaded` delivered
    local live = {}

    local function deliver(src, character)
        live[src] = character.id
        if handlers.loaded then
            local ok, err = pcall(handlers.loaded, src, character)
            if not ok then print(('^1[%s] character loaded handler failed for %s: %s^0'):format(resource, src, err)) end
        end
    end

    local function finish(src, charId)
        if live[src] == nil then return end
        live[src] = nil
        if handlers.unloaded then
            local ok, err = pcall(handlers.unloaded, src, charId)
            if not ok then print(('^1[%s] character unloaded handler failed for %s: %s^0'):format(resource, src, err)) end
        end
    end

    AddEventHandler('ai-core:playerLoaded', function(src, character)
        if live[src] ~= nil then finish(src, live[src]) end
        deliver(src, character)
    end)
    AddEventHandler('ai-core:playerUnloaded', function(src, charId) finish(src, charId) end)
    -- ai-core unloads on drop itself; this only catches a drop whose unload never came (ai-core stopping).
    AddEventHandler('playerDropped', function()
        local src = source
        SetTimeout(0, function()
            if live[src] ~= nil then finish(src, live[src]) end
        end)
    end)
    SetTimeout(0, function()
        local core = exports['ai-core']
        for _, src in ipairs(core:GetLoadedSources() or {}) do
            if live[src] == nil then
                local character = core:GetCharacter(src)
                if character then deliver(src, character) end
            end
        end
    end)
end
