---The vehicle behind a client's network id when the player is near it: within `metres` (default 5) of it, or, with
---`driver = true`, in its driver seat. 0 otherwise.
---@param src integer
---@param netId any
---@param options? { metres?: number, driver?: boolean }
---@return integer
return function(src, netId, options)
    options = options or {}
    local vehicle = aiLib.vehicleFromNet(netId)
    if vehicle == 0 then return 0 end
    local ped = GetPlayerPed(src)
    if options.driver then return GetPedInVehicleSeat(vehicle, -1) == ped and vehicle or 0 end
    return #(GetEntityCoords(ped) - GetEntityCoords(vehicle)) <= (options.metres or 5) and vehicle or 0
end
