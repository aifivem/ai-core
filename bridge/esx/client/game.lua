-- ESX on ai-core, client side: ESX.Game's entity, spawning, raycast and 3D text helpers, plain natives and ai-lib
-- helpers, copied from es_extended 1.12.4 / 1.16.3 and esx_lib (GPL-3.0).

ESX.playerId = PlayerId()
ESX.serverId = GetPlayerServerId(ESX.playerId)
ESX.Game.Utils = {}

---@param ped integer
---@param transparent? boolean
---@return integer|nil, string|nil
function ESX.Game.GetPedMugshot(ped, transparent)
    return aiLib.pedHeadshot(ped, transparent)
end

---@param entity integer
---@param coords vector3|vector4|table
---@param cb? function
function ESX.Game.Teleport(entity, coords, cb)
    if DoesEntityExist(entity) then
        RequestCollisionAtCoord(coords.x, coords.y, coords.z)
        while not HasCollisionLoadedAroundEntity(entity) do Wait(0) end
        SetEntityCoords(entity, coords.x, coords.y, coords.z, false, false, false, false)
        SetEntityHeading(entity, coords.w or coords.heading or 0.0)
    end
    if cb then cb() end
end

--- A local object (strict entity lockdown: networked objects come from the server).
---@param object string|integer
---@param coords vector3|table
---@param cb? function
---@param networked? boolean
---@return integer|nil
function ESX.Game.SpawnObject(object, coords, cb, networked)
    local model = type(object) == 'number' and object or joaat(object)
    ESX.Streaming.RequestModel(model)
    local obj = CreateObject(model, coords.x, coords.y, coords.z, networked == true, false, true)
    SetModelAsNoLongerNeeded(model)
    if cb then return cb(obj) end
    return obj
end

---@param object string|integer
---@param coords vector3|table
---@param cb? function
function ESX.Game.SpawnLocalObject(object, coords, cb) return ESX.Game.SpawnObject(object, coords, cb, false) end

---@param vehicle integer
function ESX.Game.DeleteVehicle(vehicle)
    SetEntityAsMissionEntity(vehicle, true, true)
    DeleteVehicle(vehicle)
end

---@param object integer
function ESX.Game.DeleteObject(object)
    SetEntityAsMissionEntity(object, false, true)
    DeleteObject(object)
end

--- A local vehicle (strict entity lockdown: networked vehicles are spawned by the server).
---@param vehicleModel string|integer
---@param coords vector3|table
---@param heading number
---@param cb? fun(vehicle: integer)
---@return integer|nil
function ESX.Game.SpawnLocalVehicle(vehicleModel, coords, heading, cb)
    local model = type(vehicleModel) == 'number' and vehicleModel or joaat(vehicleModel)
    local p = not cb and promise.new()
    CreateThread(function()
        if not ESX.Streaming.RequestModel(model) then
            if p then p:resolve(nil) end
            return
        end
        local vehicle = CreateVehicle(model, coords.x, coords.y, coords.z, heading or 0.0, false, true)
        SetVehicleHasBeenOwnedByPlayer(vehicle, true)
        SetVehicleNeedsToBeHotwired(vehicle, false)
        SetModelAsNoLongerNeeded(model)
        SetVehRadioStation(vehicle, 'OFF')
        if p then p:resolve(vehicle) elseif cb then cb(vehicle) end
    end)
    if p then return Citizen.Await(p) end
end

---@param vehicle integer
---@return boolean
function ESX.Game.IsVehicleEmpty(vehicle)
    return GetVehicleNumberOfPassengers(vehicle) == 0 and IsVehicleSeatFree(vehicle, -1)
end

---@param shape integer
function ESX.Game.GetShapeTestResultSync(shape)
    local handle, hit, coords, normal, material, entity
    repeat
        handle, hit, coords, normal, material, entity = GetShapeTestResultIncludingMaterial(shape)
        Wait(0)
    until handle ~= 1
    return hit, coords, normal, material, entity
end

---@param depth number
function ESX.Game.RaycastScreen(depth, ...)
    local world, normal = GetWorldCoordFromScreenCoord(0.5, 0.5)
    local from = world + normal
    local target = world + normal * depth
    return target, ESX.Game.GetShapeTestResultSync(StartShapeTestLosProbe(from.x, from.y, from.z, target.x, target.y, target.z, ...))
end

---@return integer|nil, vector3|nil
function ESX.Game.GetVehicleInDirection()
    local _, hit, coords, _, _, entity = ESX.Game.RaycastScreen(5, 10, PlayerPedId())
    if hit and IsEntityAVehicle(entity) then return entity, coords end
end

---@param coords vector3|table
---@param text string
---@param size? number
---@param font? integer
function ESX.Game.Utils.DrawText3D(coords, text, size, font)
    local at = vector3(coords.x, coords.y, coords.z)
    local scale = ((size or 1) / #(at - GetFinalRenderedCamCoord())) * 2 * ((1 / GetGameplayCamFov()) * 100)
    SetTextScale(0.0, 0.55 * scale)
    SetTextFont(font or 0)
    SetTextProportional(true)
    SetTextColour(255, 255, 255, 215)
    BeginTextCommandDisplayText('STRING')
    SetTextCentre(true)
    AddTextComponentSubstringPlayerName(text)
    SetDrawOrigin(at.x, at.y, at.z, 0)
    EndTextCommandDisplayText(0.0, 0.0)
    ClearDrawOrigin()
end

-- Raycasts (ESX has no starter; these read an object with Stop / IsActive / result) ---------------------------------

---@param raycast table|nil
function ESX.Game.StopRaycasting(raycast)
    if raycast and raycast.active then raycast:Stop() end
end

---@param raycast table|nil
---@return boolean
function ESX.Game.IsRaycastActive(raycast)
    if raycast and raycast.active then return raycast:IsActive() end
    return false
end

---@param raycast table|nil
---@return table|nil
function ESX.Game.GetRaycastResult(raycast)
    if raycast and raycast.active then return raycast.result end
end
