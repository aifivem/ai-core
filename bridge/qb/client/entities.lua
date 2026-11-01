-- QBCore.Functions entity helpers (qb-core client/functions.lua, GPL-3.0): coordinates, pools, players and peds
-- near a point, models, animation dictionaries, vehicle delete and label.

local F = QBCore.Functions

---@param coords? vector3|table
local function origin(coords)
    if coords then return vector3(coords.x, coords.y, coords.z) end
    return GetEntityCoords(PlayerPedId())
end

---@param entity integer
---@return vector4
function F.GetCoords(entity)
    local coords = GetEntityCoords(entity)
    return vector4(coords.x, coords.y, coords.z, GetEntityHeading(entity))
end

---@return string
function F.GetName()
    local charinfo = BridgeQBClient.getPlayerData().charinfo or {}
    return ('%s %s'):format(charinfo.firstname or '', charinfo.lastname or '')
end

---@return integer[]
function F.GetVehicles() return GetGamePool('CVehicle') end
---@return integer[]
function F.GetObjects() return GetGamePool('CObject') end
---@return integer[]
function F.GetPlayers() return GetActivePlayers() end

---@param coords? vector3|table
---@param distance? number
---@return integer[]
function F.GetPlayersFromCoords(coords, distance)
    local from, out = origin(coords), {}
    for _, player in ipairs(GetActivePlayers()) do
        if #(GetEntityCoords(GetPlayerPed(player)) - from) <= (distance or 5) then out[#out + 1] = player end
    end
    return out
end

---@param ignoreList? integer[]
---@return integer[]
function F.GetPeds(ignoreList)
    local ignore, out = {}, {}
    for _, ped in ipairs(ignoreList or {}) do ignore[ped] = true end
    for _, ped in ipairs(GetGamePool('CPed')) do
        if not ignore[ped] then out[#out + 1] = ped end
    end
    return out
end

--- The closest ped other than the local one and the peds of `ignoreList`, and the distance; -1, -1 when none.
---@param coords? vector3|table
---@param ignoreList? integer[]
---@return integer, number
function F.GetClosestPed(coords, ignoreList)
    local ignore
    if type(ignoreList) == 'table' and next(ignoreList) then
        ignore = {}
        for _, ped in ipairs(ignoreList) do ignore[ped] = true end
    end
    return BridgeClient.closest('ped', coords, ignore and function(ped) return not ignore[ped] end)
end

---@param coords? vector3|table
---@return integer, number
function F.GetClosestObject(coords) return BridgeClient.closest('object', coords) end

---@param model string|integer
---@param timeout? integer
---@return boolean, integer|string
function F.LoadModel(model, timeout)
    local hash = type(model) == 'number' and model or joaat(model)
    return aiLib.requestModel(hash, timeout or 5000) ~= nil, hash
end

---@param animDict string
---@param timeout? integer
---@return boolean, string
function F.RequestAnimDict(animDict, timeout)
    return aiLib.requestAnimDict(animDict, timeout or 5000) ~= nil, animDict
end

---@param vehicle integer
function F.DeleteVehicle(vehicle)
    SetEntityAsMissionEntity(vehicle, true, true)
    DeleteVehicle(vehicle)
end

---@param vehicle integer
---@return string|nil
function F.GetVehicleLabel(vehicle)
    if not vehicle or vehicle == 0 then return end
    return aiLib.vehicleLabel(vehicle)
end
