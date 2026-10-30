-- ESX on ai-core, client helpers: ESX.Game (entities and spawning, without vehicle properties), ESX.Streaming, the
-- points behind ESX.Point, ESX.RegisterInput and small utilities. Plain natives, copied from es_extended 1.12.4
-- (GPL-3.0).

ESX.playerId = PlayerId()
ESX.serverId = GetPlayerServerId(ESX.playerId)
ESX.Game.Utils = {}
ESX.Streaming = {}

-- Streaming ----------------------------------------------------------------------------------------------------------

---@param has fun(asset: any): boolean
---@param request fun(asset: any)
---@param asset any
---@param cb? function
local function load(has, request, asset, cb)
    if not has(asset) then
        request(asset)
        while not has(asset) do Wait(0) end
    end
    if cb then cb(asset) end
    return asset
end

---@param modelHash string|integer
---@param cb? function
---@return integer|nil
function ESX.Streaming.RequestModel(modelHash, cb)
    modelHash = type(modelHash) == 'number' and modelHash or joaat(modelHash)
    if not IsModelInCdimage(modelHash) then return end
    return load(HasModelLoaded, RequestModel, modelHash, cb)
end

---@param textureDict string
---@param cb? function
function ESX.Streaming.RequestStreamedTextureDict(textureDict, cb)
    return load(HasStreamedTextureDictLoaded, function(d) RequestStreamedTextureDict(d, false) end, textureDict, cb)
end

---@param assetName string
---@param cb? function
function ESX.Streaming.RequestNamedPtfxAsset(assetName, cb)
    return load(HasNamedPtfxAssetLoaded, RequestNamedPtfxAsset, assetName, cb)
end

---@param animSet string
---@param cb? function
function ESX.Streaming.RequestAnimSet(animSet, cb)
    return load(HasAnimSetLoaded, RequestAnimSet, animSet, cb)
end

---@param animDict string
---@param cb? function
function ESX.Streaming.RequestAnimDict(animDict, cb)
    return load(HasAnimDictLoaded, RequestAnimDict, animDict, cb)
end

---@param weaponHash string|integer
---@param cb? function
function ESX.Streaming.RequestWeaponAsset(weaponHash, cb)
    return load(HasWeaponAssetLoaded, function(w) RequestWeaponAsset(w, 31, 0) end, weaponHash, cb)
end

-- Game ---------------------------------------------------------------------------------------------------------------

---@param ped integer
---@param transparent? boolean
---@return integer|nil, string|nil
function ESX.Game.GetPedMugshot(ped, transparent)
    if not DoesEntityExist(ped) then return end
    local mugshot = transparent and RegisterPedheadshotTransparent(ped) or RegisterPedheadshot(ped)
    while not IsPedheadshotReady(mugshot) do Wait(0) end
    return mugshot, GetPedheadshotTxdString(mugshot)
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

---@param coords? vector3|table
---@param modelFilter? table<integer, boolean>
function ESX.Game.GetClosestObject(coords, modelFilter)
    return ESX.Game.GetClosestEntity(ESX.Game.GetObjects(), false, coords, modelFilter)
end

---@param coords? vector3|table
---@param modelFilter? table<integer, boolean>
function ESX.Game.GetClosestPed(coords, modelFilter)
    return ESX.Game.GetClosestEntity(ESX.Game.GetPeds(true), false, coords, modelFilter)
end

---@param coords? vector3|table
function ESX.Game.GetClosestPlayer(coords)
    return ESX.Game.GetClosestEntity(ESX.Game.GetPlayers(true, true), true, coords, nil)
end

---@param coords? vector3|table
---@param modelFilter? table<integer, boolean>
function ESX.Game.GetClosestVehicle(coords, modelFilter)
    return ESX.Game.GetClosestEntity(ESX.Game.GetVehicles(), false, coords, modelFilter)
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
function ESX.Game.GetVehiclesInArea(coords, maxDistance)
    return within(ESX.Game.GetVehicles(), false, coords, maxDistance)
end

---@param coords vector3|table
---@param maxDistance number
---@return boolean
function ESX.Game.IsSpawnPointClear(coords, maxDistance)
    return #ESX.Game.GetVehiclesInArea(coords, maxDistance) == 0
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

-- Points (ESX.Point from imports.lua) ---------------------------------------------------------------------------------

---@class ESXPointInternal
---@field coords vector3
---@field distance number
---@field hidden? boolean
---@field enter function
---@field leave function
---@field resource string
---@field nearby? boolean

---@type table<integer, ESXPointInternal>
local points = {}
local nextPoint = 0
local looping = false

local function pointsLoop()
    if looping then return end
    looping = true
    CreateThread(function()
        while next(points) do
            local coords = GetEntityCoords(PlayerPedId())
            for _, point in pairs(points) do
                if not point.hidden and #(coords - point.coords) <= point.distance then
                    if not point.nearby then
                        point.nearby = true
                        BridgeUI.call(point.enter)
                    end
                elseif point.nearby then
                    point.nearby = false
                    BridgeUI.call(point.leave)
                end
            end
            Wait(500)
        end
        looping = false
    end)
end

---@param coords vector3
---@param distance number
---@param hidden? boolean
---@param enter function
---@param leave function
---@return integer
function ESX.CreatePointInternal(coords, distance, hidden, enter, leave)
    nextPoint = nextPoint + 1
    points[nextPoint] = {
        coords = vector3(coords.x, coords.y, coords.z),
        distance = distance,
        hidden = hidden,
        enter = enter,
        leave = leave,
        resource = GetInvokingResource() or GetCurrentResourceName(),
    }
    pointsLoop()
    return nextPoint
end

---@param handle integer
function ESX.RemovePointInternal(handle) points[handle] = nil end

---@param handle integer
---@param hidden boolean
function ESX.HidePointInternal(handle, hidden)
    if points[handle] then points[handle].hidden = hidden end
end

-- Inputs and utilities ------------------------------------------------------------------------------------------------

---@param str string
---@return string
function ESX.HashString(str)
    return ('~INPUT_%s~'):format(('%x'):format(joaat(str) & 0x7fffffff + 2 ^ 31):upper())
end

--- A key mapping for the calling script (registered in ai-core, so it goes when ai-core stops).
---@param command_name string
---@param label string
---@param input_group string
---@param key string
---@param on_press function
---@param on_release? function
function ESX.RegisterInput(command_name, label, input_group, key, on_press, on_release)
    local command = on_release and '+' .. command_name or command_name
    RegisterCommand(command, function() BridgeUI.call(on_press) end, false)
    if on_release then RegisterCommand('-' .. command_name, function() BridgeUI.call(on_release) end, false) end
    RegisterKeyMapping(command, label or '', input_group or 'keyboard', key or '')
end

---@param account string
---@return table|nil
function ESX.GetAccount(account)
    for _, entry in ipairs(ESX.PlayerData.accounts or {}) do
        if entry.name == account then return entry end
    end
end

--- ESX's await form of TriggerServerCallback.
---@param name string
---@return any
function ESX.AwaitServerCallback(name, ...)
    local p = promise.new()
    BridgeClient.esxCallback(name, function(...) p:resolve({ ... }) end, ...)
    return table.unpack(Citizen.Await(p))
end

AddEventHandler('onClientResourceStop', function(resource)
    for handle, point in pairs(points) do
        if point.resource == resource then points[handle] = nil end
    end
end)
