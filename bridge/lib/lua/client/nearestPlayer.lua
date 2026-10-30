---The closest other player within `metres` of the local ped (or of `options.from`), as a server id; `filter` gets the
---server id and the ped. nil when none. Walks the streamed players only.
---@param metres number
---@param options? { from?: vector3|{x: number, y: number, z: number}, filter?: fun(serverId: integer, ped: integer): boolean }
---@return integer?
return function(metres, options)
    options = options or {}
    local from = options.from and vector3(options.from.x, options.from.y, options.from.z)
        or GetEntityCoords(aiLib.cache.ped)
    local me = aiLib.cache.playerId
    local best, bestDist = nil, metres
    for _, player in ipairs(GetActivePlayers()) do
        if player ~= me then
            local ped = GetPlayerPed(player)
            local d = #(GetEntityCoords(ped) - from)
            if d <= bestDist then
                local serverId = GetPlayerServerId(player)
                if not options.filter or options.filter(serverId, ped) then best, bestDist = serverId, d end
            end
        end
    end
    return best
end
