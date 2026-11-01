-- QBCore.Functions closest player and vehicle, and a vehicle's plate.

---@param coords? vector3|vector4|table
---@return vector3
local function origin(coords)
    if coords then return vector3(coords.x, coords.y, coords.z) end
    return GetEntityCoords(PlayerPedId())
end

--- The closest other player to `coords` (default: the local ped) and the distance.
---@param coords? vector3|table
---@return integer, number
function QBCore.Functions.GetClosestPlayer(coords)
    coords = origin(coords)
    local closest, distance = -1, -1
    for _, player in ipairs(GetActivePlayers()) do
        if player ~= PlayerId() then
            local d = #(coords - GetEntityCoords(GetPlayerPed(player)))
            if distance == -1 or d < distance then closest, distance = player, d end
        end
    end
    return closest, distance
end

--- The closest vehicle to `coords` (default the local ped) and the distance; -1, -1 when none.
---@param coords? vector3|table
---@return integer, number
function QBCore.Functions.GetClosestVehicle(coords)
    return BridgeClient.closest('vehicle', coords)
end

---@param vehicle integer
function QBCore.Functions.GetPlate(vehicle)
    return vehicle ~= 0 and (GetVehicleNumberPlateText(vehicle):gsub('^%s*(.-)%s*$', '%1')) or nil
end
