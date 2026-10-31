---The ped of a player by server id: `cache.ped` for the local player, 0 when that player is not in scope (never the
---local ped through `GetPlayerPed(-1)`).
---@param serverId integer
---@return integer
return function(serverId)
    if serverId == aiLib.cache.serverId then return aiLib.cache.ped end
    local player = GetPlayerFromServerId(serverId)
    if player == -1 then return 0 end
    return GetPlayerPed(player)
end
