-- ESX on ai-core, client side: ESX.Game's entity pools and closest / in-area lookups, copied from es_extended 1.12.4 /
-- 1.16.3 (GPL-3.0).

---@return integer[]
function ESX.Game.GetObjects() return GetGamePool('CObject') end

---@return integer[]
function ESX.Game.GetVehicles() return GetGamePool('CVehicle') end

---@param onlyOtherPeds? boolean
---@return integer[]
function ESX.Game.GetPeds(onlyOtherPeds)
    local pool = GetGamePool('CPed')
    if onlyOtherPeds then
        local own = PlayerPedId()
        for i = 1, #pool do
            if pool[i] == own then
                table.remove(pool, i)
                break
            end
        end
    end
    return pool
end

---@param onlyOtherPlayers? boolean
---@param returnKeyValue? boolean
---@param returnPeds? boolean
---@return table
function ESX.Game.GetPlayers(onlyOtherPlayers, returnKeyValue, returnPeds)
    local players = {}
    for _, player in ipairs(GetActivePlayers()) do
        local ped = GetPlayerPed(player)
        if DoesEntityExist(ped) and (not onlyOtherPlayers or player ~= ESX.playerId) then
            if returnKeyValue then
                players[player] = ped
            else
                players[#players + 1] = returnPeds and ped or player
            end
        end
    end
    return players
end

---@param coords? vector3|table
local function origin(coords)
    if coords then return vector3(coords.x, coords.y, coords.z) end
    return GetEntityCoords(PlayerPedId())
end

---@param entities table
---@param isPlayerEntities boolean
---@param coords? vector3|table
---@param modelFilter? table<integer, boolean>
---@return integer, number
function ESX.Game.GetClosestEntity(entities, isPlayerEntities, coords, modelFilter)
    local closest, closestDistance = -1, -1
    local from = origin(coords)
    for k, entity in pairs(entities) do
        if not modelFilter or modelFilter[GetEntityModel(entity)] then
            local distance = #(from - GetEntityCoords(entity))
            if closestDistance == -1 or distance < closestDistance then
                closest, closestDistance = isPlayerEntities and k or entity, distance
            end
        end
    end
    return closest, closestDistance
end

--- Only entities whose model is a key of `modelFilter` (nil: every entity).
---@param modelFilter? table<integer, boolean>
---@return (fun(entity: integer): boolean)|nil
local function byModel(modelFilter)
    if type(modelFilter) ~= 'table' then return nil end
    return function(entity) return modelFilter[GetEntityModel(entity)] and true or false end
end

---@param coords? vector3|table
---@param modelFilter? table<integer, boolean>
---@return integer, number
function ESX.Game.GetClosestObject(coords, modelFilter)
    return BridgeClient.closest('object', coords, byModel(modelFilter))
end

--- The closest ped other than the local one.
---@param coords? vector3|table
---@param modelFilter? table<integer, boolean>
---@return integer, number
function ESX.Game.GetClosestPed(coords, modelFilter)
    return BridgeClient.closest('ped', coords, byModel(modelFilter))
end

---@param coords? vector3|table
function ESX.Game.GetClosestPlayer(coords)
    return ESX.Game.GetClosestEntity(ESX.Game.GetPlayers(true, true), true, coords, nil)
end

---@param coords? vector3|table
---@param modelFilter? table<integer, boolean>
---@return integer, number
function ESX.Game.GetClosestVehicle(coords, modelFilter)
    return BridgeClient.closest('vehicle', coords, byModel(modelFilter))
end

---@param entities table
---@param isPlayerEntities boolean
---@param coords? vector3|table
---@param maxDistance number
---@return table
local function within(entities, isPlayerEntities, coords, maxDistance)
    local out = {}
    local from = origin(coords)
    for k, entity in pairs(entities) do
        if #(from - GetEntityCoords(entity)) <= maxDistance then out[#out + 1] = isPlayerEntities and k or entity end
    end
    return out
end

---@param coords? vector3|table
---@param maxDistance number
function ESX.Game.GetPlayersInArea(coords, maxDistance)
    return within(ESX.Game.GetPlayers(true, true), true, coords, maxDistance)
end

---@param coords? vector3|table
---@param maxDistance number
---@return integer[]
function ESX.Game.GetVehiclesInArea(coords, maxDistance)
    return aiLib.entitiesInArea('vehicle', origin(coords), maxDistance)
end

---@param coords vector3|table
---@param maxDistance number
---@return boolean
function ESX.Game.IsSpawnPointClear(coords, maxDistance)
    return aiLib.isSpawnClear(origin(coords), maxDistance)
end
