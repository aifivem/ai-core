-- ESX on ai-core, client helpers: ESX.Game (entities, spawning, vehicle properties, raycasts), ESX.Streaming,
-- ESX.Scaleform, the points behind ESX.Point, ESX.RegisterInput, player spawning and small utilities. Plain natives
-- and ai-lib helpers, copied from es_extended 1.12.4 / 1.16.3 and esx_lib (GPL-3.0).

ESX.playerId = PlayerId()
ESX.serverId = GetPlayerServerId(ESX.playerId)
ESX.Game.Utils = {}
ESX.Streaming = {}

-- Streaming (ai-lib's loaders: a missing asset or a load past the timeout answers nil instead of waiting forever) ----

---@param asset any
---@param cb? function
local function done(asset, cb)
    if asset ~= nil and cb then cb(asset) end
    return asset
end

---@param modelHash string|integer
---@param cb? function
---@return integer|nil
function ESX.Streaming.RequestModel(modelHash, cb) return done(aiLib.requestModel(modelHash), cb) end

---@param textureDict string
---@param cb? function
function ESX.Streaming.RequestStreamedTextureDict(textureDict, cb) return done(aiLib.requestTextureDict(textureDict), cb) end

---@param assetName string
---@param cb? function
function ESX.Streaming.RequestNamedPtfxAsset(assetName, cb) return done(aiLib.requestPtfxAsset(assetName), cb) end

---@param animSet string
---@param cb? function
function ESX.Streaming.RequestAnimSet(animSet, cb) return done(aiLib.requestAnimSet(animSet), cb) end

---@param animDict string
---@param cb? function
function ESX.Streaming.RequestAnimDict(animDict, cb) return done(aiLib.requestAnimDict(animDict), cb) end

---@param weaponHash string|integer
---@param cb? function
function ESX.Streaming.RequestWeaponAsset(weaponHash, cb) return done(aiLib.requestWeaponAsset(weaponHash), cb) end

-- Game ---------------------------------------------------------------------------------------------------------------

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
--- The points are spheres of ai-lib's Zones (one scheduler job for all of them, each checked every 500 ms).
local zones = aiLib.Zones.new()

---@param handle integer
local function leave(handle)
    local point = points[handle]
    if point and point.nearby then
        point.nearby = false
        BridgeUI.call(point.leave)
    end
end

---@param handle integer
local function watch(handle)
    local point = points[handle]
    zones:add(tostring(handle), {
        shape = { type = 'sphere', center = point.coords, radius = point.distance },
        onEnter = function()
            point.nearby = true
            BridgeUI.call(point.enter)
        end,
        onExit = function() leave(handle) end,
    })
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
    if not hidden then watch(nextPoint) end
    return nextPoint
end

---@param handle integer
function ESX.RemovePointInternal(handle)
    if not points[handle] then return end
    zones:remove(tostring(handle))
    leave(handle)
    points[handle] = nil
end

---@param handle integer
---@param hidden boolean
function ESX.HidePointInternal(handle, hidden)
    local point = points[handle]
    if not point or point.hidden == hidden then return end
    point.hidden = hidden
    if hidden then
        zones:remove(tostring(handle))
        leave(handle)
    else
        watch(handle)
    end
end

-- Inputs and utilities ------------------------------------------------------------------------------------------------

---@param str string
---@return string
function ESX.HashString(str)
    return ('~INPUT_%s~'):format(('%x'):format(joaat(str) & 0x7fffffff + 2 ^ 31):upper())
end

--- A key mapping for the calling script: an ai-lib Keybind, so it shows in the panel's keybinds and the keys screen
--- (registered in ai-core, so it goes when ai-core stops).
---@param command_name string
---@param label string
---@param input_group string
---@param key string
---@param on_press function
---@param on_release? function
function ESX.RegisterInput(command_name, label, input_group, key, on_press, on_release)
    aiLib.Keybind.new({
        name = command_name,
        description = label or command_name,
        defaultKey = key ~= '' and key or nil,
        defaultMapper = input_group ~= '' and input_group or nil,
        onPressed = function() BridgeUI.call(on_press) end,
        onReleased = on_release and function() BridgeUI.call(on_release) end or nil,
    })
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
        if point.resource == resource then
            zones:remove(tostring(handle))
            points[handle] = nil
        end
    end
end)

-- Vehicles -----------------------------------------------------------------------------------------------------------

---@type table<string, boolean>
local warnedNetworked = {}

--- ESX spawns a networked vehicle from the client; ai-core's entity lockdown lets only the server create networked
--- entities, so this is a local vehicle only this player sees (warned once per resource). Networked vehicles come from
--- the server (`ESX.OneSync.SpawnVehicle`).
---@param vehicleModel string|integer
---@param coords vector3|vector4|table
---@param heading number
---@param cb? fun(vehicle: integer)
---@param networked? boolean
---@return integer|nil
function ESX.Game.SpawnVehicle(vehicleModel, coords, heading, cb, networked)
    local resource = GetInvokingResource() or GetCurrentResourceName()
    if networked ~= false and not warnedNetworked[resource] then
        warnedNetworked[resource] = true
        print(('^3[ai-core bridge] %s spawns a networked vehicle with ESX.Game.SpawnVehicle: the server creates networked vehicles on ai-core (entity lockdown), so it is a local vehicle only this player sees. Use ESX.OneSync.SpawnVehicle on the server.^0'):format(resource))
    end
    return ESX.Game.SpawnLocalVehicle(vehicleModel, coords, heading, cb and function(vehicle) BridgeUI.call(cb, vehicle) end or nil)
end

---@param vehicle integer
---@return VehicleProperties|nil
function ESX.Game.GetVehicleProperties(vehicle)
    return BridgeVehicleProps.get(vehicle)
end

---@param vehicle integer
---@param props VehicleProperties
function ESX.Game.SetVehicleProperties(vehicle, props)
    BridgeVehicleProps.set(vehicle, props)
end

-- ESX's server spawn (`ESX.OneSync.SpawnVehicle`, ESX's vehicle class) puts the properties in the vehicle's
-- `VehicleProperties` state bag; the client that owns the vehicle applies them (a new server vehicle gets its owner a
-- moment after the bag arrives, so the owner is waited for). Only the server can write that bag.
---@diagnostic disable-next-line: param-type-mismatch
AddStateBagChangeHandler('VehicleProperties', nil, function(bagName, _, value, _, replicated)
    if replicated or type(value) ~= 'table' or not bagName:find('^entity:') then return end
    local netId = tonumber((bagName:gsub('^entity:', '')))
    if not netId then return end
    CreateThread(function()
        local vehicle = aiLib.waitForEntity(netId, 4000)
        if vehicle == 0 then return end
        local me = PlayerId()
        if not aiLib.waitFor(function() return NetworkGetEntityOwner(vehicle) == me or nil end, 3000, 100) then return end
        BridgeVehicleProps.set(vehicle, value)
    end)
end)

--- Game vehicle classes that are not cars, and models whose class says otherwise (txAdmin's list, via es_extended).
local classTypes = { [8] = 'bike', [11] = 'trailer', [13] = 'bike', [14] = 'boat', [15] = 'heli', [16] = 'plane', [21] = 'train' }
local mismatchedTypes = {
    [`airtug`] = 'automobile', [`avisa`] = 'submarine', [`blimp`] = 'heli', [`blimp2`] = 'heli', [`blimp3`] = 'heli',
    [`caddy`] = 'automobile', [`caddy2`] = 'automobile', [`caddy3`] = 'automobile', [`chimera`] = 'automobile',
    [`docktug`] = 'automobile', [`forklift`] = 'automobile', [`kosatka`] = 'submarine', [`mower`] = 'automobile',
    [`policeb`] = 'bike', [`ripley`] = 'automobile', [`rrocket`] = 'automobile', [`sadler`] = 'automobile',
    [`sadler2`] = 'automobile', [`scrap`] = 'automobile', [`slamtruck`] = 'automobile', [`Stryder`] = 'automobile',
    [`submersible`] = 'submarine', [`submersible2`] = 'submarine', [`thruster`] = 'heli', [`towtruck`] = 'automobile',
    [`towtruck2`] = 'automobile', [`tractor`] = 'automobile', [`tractor2`] = 'automobile', [`tractor3`] = 'automobile',
    [`trailersmall2`] = 'trailer', [`utillitruck`] = 'automobile', [`utillitruck2`] = 'automobile', [`utillitruck3`] = 'automobile',
}

--- The `CreateVehicleServerSetter` type of a model, false when the game has no such vehicle.
---@param model string|integer
---@return string|false
function ESX.GetVehicleTypeClient(model)
    model = type(model) == 'string' and joaat(model) or model
    if not IsModelInCdimage(model) or not IsModelAVehicle(model) then return false end
    return mismatchedTypes[model] or classTypes[GetVehicleClassFromName(model)] or 'automobile'
end

ESX.GetVehicleType = ESX.GetVehicleTypeClient

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

-- Scaleform (esx_lib scaleform) --------------------------------------------------------------------------------------

ESX.Scaleform = { Utils = {} }

--- Loads a scaleform movie; the handle once loaded (waits up to 5 s, ESX waits forever).
---@param movie string
---@return integer
function ESX.Scaleform.Utils.RequestScaleformMovie(movie)
    local scaleform = RequestScaleformMovie(movie)
    aiLib.waitFor(function() return HasScaleformMovieLoaded(scaleform) or nil end, 5000)
    return scaleform
end

--- Calls a method of a scaleform movie (loaded by name when a name is given). The caller frees the movie with
--- `SetScaleformMovieAsNoLongerNeeded`.
---@param scaleform integer|string
---@param methodName string
---@param returnValue? boolean
---@param ... number|string|boolean
---@return integer, integer?
function ESX.Scaleform.Utils.RunMethod(scaleform, methodName, returnValue, ...)
    if type(scaleform) ~= 'number' then scaleform = ESX.Scaleform.Utils.RequestScaleformMovie(scaleform) end
    BeginScaleformMovieMethod(scaleform, methodName)
    for _, arg in ipairs({ ... }) do
        local kind = type(arg)
        if kind == 'number' then
            if math.type(arg) == 'float' then ScaleformMovieMethodAddParamFloat(arg) else ScaleformMovieMethodAddParamInt(arg) end
        elseif kind == 'string' then
            ScaleformMovieMethodAddParamTextureNameString(arg)
        elseif kind == 'boolean' then
            ScaleformMovieMethodAddParamBool(arg)
        end
    end
    if returnValue then return scaleform, EndScaleformMovieMethodReturnValue() end
    EndScaleformMovieMethod()
    return scaleform
end

--- Draws a movie full screen for `sec` seconds from ai-lib's scheduler, then frees it; waits like ESX.
---@param scaleform integer
---@param sec number
local function showFor(scaleform, sec)
    local job = aiLib.every(0, function() DrawScaleformMovieFullscreen(scaleform, 255, 255, 255, 255, 0) end, { name = 'esxScaleform' })
    Wait(math.floor((tonumber(sec) or 0) * 1000))
    job:stop()
    SetScaleformMovieAsNoLongerNeeded(scaleform)
end

---@param title string
---@param msg string
---@param sec number
function ESX.Scaleform.ShowFreemodeMessage(title, msg, sec)
    showFor(ESX.Scaleform.Utils.RunMethod('MP_BIG_MESSAGE_FREEMODE', 'SHOW_SHARD_WASTED_MP_MESSAGE', false, title, msg), sec)
end

---@param title string
---@param msg string
---@param bottom string
---@param sec number
function ESX.Scaleform.ShowBreakingNews(title, msg, bottom, sec)
    local scaleform = ESX.Scaleform.Utils.RunMethod('BREAKING_NEWS', 'SET_TEXT', false, msg, bottom)
    ESX.Scaleform.Utils.RunMethod(scaleform, 'SET_SCROLL_TEXT', false, 0, 0, title)
    ESX.Scaleform.Utils.RunMethod(scaleform, 'DISPLAY_SCROLL_TEXT', false, 0, 0)
    showFor(scaleform, sec)
end

---@param title string
---@param msg string
---@param bottom string
---@param sec number
function ESX.Scaleform.ShowPopupWarning(title, msg, bottom, sec)
    showFor(ESX.Scaleform.Utils.RunMethod('POPUP_WARNING', 'SHOW_POPUP_WARNING', false, 500.0, title, msg, bottom, true), sec)
end

---@param sec number
function ESX.Scaleform.ShowTrafficMovie(sec)
    showFor(ESX.Scaleform.Utils.RunMethod('TRAFFIC_CAM', 'PLAY_CAM_MOVIE', false), sec)
end

-- Spawning -----------------------------------------------------------------------------------------------------------

--- ai-core runs no spawnmanager; switches its auto spawn off when one runs anyway.
function ESX.DisableSpawnManager()
    if GetResourceState('spawnmanager') == 'started' then exports.spawnmanager:setAutoSpawn(false) end
end

--- ESX's SpawnPlayer: the skin through `skinchanger:loadSkin` (whatever clothing script answers it, up to 3 s), the
--- player moved there by ai-lib's teleport and brought back to life, then `playerSpawned` and `cb`. ai-core spawns
--- characters itself; this serves scripts that move or respawn the player with it.
---@param skin? table
---@param coords vector3|vector4|table
---@param cb? function
function ESX.SpawnPlayer(skin, coords, cb)
    if type(skin) == 'table' then
        local loaded = false
        TriggerEvent('skinchanger:loadSkin', skin, function() loaded = true end)
        aiLib.waitFor(function() return loaded or nil end, 3000)
    end
    local heading = (coords.heading or coords.w or 0.0) + 0.0
    aiLib.player.teleport(coords, { heading = heading, fade = false })
    NetworkResurrectLocalPlayer(coords.x + 0.0, coords.y + 0.0, coords.z + 0.0, heading, 0, true)
    TriggerEvent('playerSpawned', coords)
    if cb then BridgeUI.call(cb) end
end
