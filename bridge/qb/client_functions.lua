-- QBCore on ai-core, client side: the rest of qb-core's client/functions.lua (animations, particles, props, bones,
-- vehicle spawning and properties) and client/events.lua (command events, vehicle enter / leave events), mapped onto
-- ai-lib's helpers; plain native code copied from qb-core 1.3.0 (GPL-3.0). Loaded before ui.lua, which answers every
-- QBCore.Functions entry as an export too.

local RESOURCE = GetCurrentResourceName()
local F = QBCore.Functions

---@param coords? vector3|vector4|table
---@return vector3
local function origin(coords)
    if coords then return vector3(coords.x, coords.y, coords.z) end
    return GetEntityCoords(aiLib.cache.ped)
end

---@return string
local function invoker() return GetInvokingResource() or RESOURCE end

-- Animations -----------------------------------------------------------------------------------------------------------

--- Turns the local ped to face `entity` (the game's turn task; `speed` is not used) and waits until it does or
--- `timeout` ms (at most 5000) pass. QB answers an error text for a bad entity.
---@param entity integer
---@param timeout? integer
---@param _speed? number
---@return string|nil
function F.LookAtEntity(entity, timeout, _speed)
    if type(entity) ~= 'number' then return invoker() .. ' :^1  Entity must be a number' end
    if not DoesEntityExist(entity) then return invoker() .. ' :^1  Entity does not exist' end
    timeout = math.min(tonumber(timeout) or 5000, 5000)
    local ped = aiLib.cache.ped
    local target = aiLib.numbers.headingTo(GetEntityCoords(ped), GetEntityCoords(entity))
    TaskTurnPedToFaceEntity(ped, entity, timeout)
    aiLib.waitFor(function()
        local diff = math.abs(target - GetEntityHeading(ped)) % 360
        return (diff < 2 or diff > 358) or nil
    end, timeout, 50)
    SetEntityHeading(ped, target)
end

--- Plays an animation on the local ped and waits until it ends (or `duration` ms); returns the clip length in seconds,
--- or QB's error text.
---@param animDict string
---@param animName string
---@param upperbodyOnly? boolean
---@param duration? integer -1 or nil: the whole clip, looped
---@return number|string
function F.PlayAnim(animDict, animName, upperbodyOnly, duration)
    if type(animDict) ~= 'string' or type(animName) ~= 'string' then return invoker() .. ' :^1  Wrong type for animDict or animName' end
    if not DoesAnimDictExist(animDict) then return invoker() .. ' :^1  Animation dictionary does not exist' end
    if not aiLib.requestAnimDict(animDict, 5000) then return invoker() .. ' :^1  Animation dictionary failed to load' end
    local runTime = duration or -1
    local flag = runTime == -1 and 49 or (upperbodyOnly and 16 or 0)
    aiLib.player.playAnim(animDict, animName, { flag = flag, duration = runTime, blendIn = 8.0, blendOut = 8.0 })
    Wait(10)
    local length = GetAnimDuration(animDict, animName)
    if length == 0 then return invoker() .. ' :^1  Animation does not exist' end
    Wait(math.floor(duration and duration > 0 and math.min(duration, length * 1000) or length * 1000))
    RemoveAnimDict(animDict)
    return length
end

---@param animSet string
---@param timeout? integer
---@return boolean, string
function F.LoadAnimSet(animSet, timeout)
    return aiLib.requestAnimSet(animSet, timeout or 5000) ~= nil, animSet
end

--- Whether the local ped's arms (component 3) are a gloved drawable.
---@return boolean
function F.IsWearingGloves()
    local ped = aiLib.cache.ped
    local arms = GetPedDrawableVariation(ped, 3)
    local bare = GetEntityModel(ped) == joaat('mp_m_freemode_01') and QBCore.Shared.MaleNoGloves or QBCore.Shared.FemaleNoGloves
    return not bare[arms]
end

-- Particles (local effects, as in qb-core) -----------------------------------------------------------------------------

---@param dictionary string
---@param timeout? integer
---@return boolean, string
function F.LoadParticleDictionary(dictionary, timeout)
    return aiLib.requestPtfxAsset(dictionary, timeout or 5000) ~= nil, dictionary
end

---@class QBParticleColor
---@field r number
---@field g number
---@field b number

--- A particle at a point; looped ones return their handle (stopped after `duration` ms when given, which waits).
---@param dict string
---@param ptName string
---@param looped boolean
---@param coords? vector3|table
---@param rot vector3|table
---@param scale? number
---@param alpha? number
---@param color? QBParticleColor
---@param duration? integer
---@return integer|nil
function F.StartParticleAtCoord(dict, ptName, looped, coords, rot, scale, alpha, color, duration)
    local at = origin(coords)
    F.LoadParticleDictionary(dict)
    UseParticleFxAssetNextCall(dict)
    SetPtfxAssetNextCall(dict)
    local handle
    if looped then
        handle = StartParticleFxLoopedAtCoord(ptName, at.x, at.y, at.z, rot.x, rot.y, rot.z, scale or 1.0, false, false, false, false)
        if color then SetParticleFxLoopedColour(handle, color.r, color.g, color.b, false) end
        SetParticleFxLoopedAlpha(handle, alpha or 10.0)
        if duration then
            Wait(duration)
            StopParticleFxLooped(handle, false)
        end
    else
        SetParticleFxNonLoopedAlpha(alpha or 10.0)
        if color then SetParticleFxNonLoopedColour(color.r, color.g, color.b) end
        StartParticleFxNonLoopedAtCoord(ptName, at.x, at.y, at.z, rot.x, rot.y, rot.z, scale or 1.0, false, false, false)
    end
    return handle
end

--- A particle on an entity (at a ped bone id or an entity bone name); looped ones return their handle.
---@param dict string
---@param ptName string
---@param looped boolean
---@param entity integer
---@param bone? integer|string
---@param offset vector3|table
---@param rot vector3|table
---@param scale number
---@param alpha? number
---@param color? QBParticleColor
---@param evolution? { name: string, amount: number }
---@param duration? integer
---@return integer|nil
function F.StartParticleOnEntity(dict, ptName, looped, entity, bone, offset, rot, scale, alpha, color, evolution, duration)
    F.LoadParticleDictionary(dict)
    UseParticleFxAssetNextCall(dict)
    local handle, boneId
    if bone and GetEntityType(entity) == 1 then
        boneId = GetPedBoneIndex(entity, bone --[[@as integer]])
    elseif bone then
        boneId = GetEntityBoneIndexByName(entity, bone --[[@as string]])
    end
    if looped then
        if boneId then
            handle = StartParticleFxLoopedOnEntityBone(ptName, entity, offset.x, offset.y, offset.z, rot.x, rot.y, rot.z, boneId, scale, false, false, false)
        else
            handle = StartParticleFxLoopedOnEntity(ptName, entity, offset.x, offset.y, offset.z, rot.x, rot.y, rot.z, scale, false, false, false)
        end
        if evolution then SetParticleFxLoopedEvolution(handle, evolution.name, evolution.amount, false) end
        if color then SetParticleFxLoopedColour(handle, color.r, color.g, color.b, false) end
        SetParticleFxLoopedAlpha(handle, alpha or 10.0)
        if duration then
            Wait(duration)
            StopParticleFxLooped(handle, false)
        end
    else
        SetParticleFxNonLoopedAlpha(alpha or 10.0)
        if color then SetParticleFxNonLoopedColour(color.r, color.g, color.b) end
        if boneId then
            StartParticleFxNonLoopedOnPedBone(ptName, entity, offset.x, offset.y, offset.z, rot.x, rot.y, rot.z, boneId, scale, false, false, false)
        else
            StartParticleFxNonLoopedOnEntity(ptName, entity, offset.x, offset.y, offset.z, rot.x, rot.y, rot.z, scale, false, false, false)
        end
    end
    return handle
end

-- Props and bones ------------------------------------------------------------------------------------------------------

--- Props made by AttachProp, by the resource that asked; deleted when that resource stops.
---@type table<integer, string>
local props = {}

--- A prop held by `ped` at a ped bone id (ai-lib's `attachProp`). Local to this client (the server's entity lockdown
--- blocks client-made networked objects), so other players do not see it; 0 when the model does not load.
---@param ped integer
---@param model string|integer
---@param boneId integer
---@param x number
---@param y number
---@param z number
---@param xR number
---@param yR number
---@param zR number
---@param vertex? boolean
---@return integer
function F.AttachProp(ped, model, boneId, x, y, z, xR, yR, zR, vertex)
    local prop = aiLib.attachProp(model, {
        ped = ped,
        bone = boneId,
        offset = vector3(x, y, z),
        rotation = vector3(xR, yR, zR),
        rotationOrder = vertex and 0 or 2,
    })
    if prop ~= 0 then props[prop] = invoker() end
    return prop
end

AddEventHandler('onClientResourceStop', function(resource)
    for prop, owner in pairs(props) do
        if owner == resource or not DoesEntityExist(prop) then
            if owner == resource and DoesEntityExist(prop) then DeleteEntity(prop) end
            props[prop] = nil
        end
    end
end)

--- The bone of `list` (ids or `{ id = ... }` entries) closest to the local ped, its position and distance; the
--- `bodyshell` bone when the list is empty.
---@param entity integer
---@param list table
---@return any, vector3, number
function F.GetClosestBone(entity, list)
    local from = GetEntityCoords(aiLib.cache.ped)
    local bone, coords, distance
    for _, element in pairs(list) do
        local boneCoords = GetWorldPositionOfEntityBone(entity, type(element) == 'table' and element.id or element)
        local d = #(from - boneCoords)
        if not coords or distance > d then bone, coords, distance = element, boneCoords, d end
    end
    if not bone then
        bone = { id = GetEntityBoneIndexByName(entity, 'bodyshell'), type = 'remains', name = 'bodyshell' }
        coords = GetWorldPositionOfEntityBone(entity, bone.id)
        distance = #(coords - from)
    end
    return bone, coords, distance
end

--- Distance from the local ped to a bone of `entity`: `boneType` 1 = ped bone id, else a bone name.
---@param entity integer
---@param boneType integer
---@param boneIndex integer|string
---@return number
function F.GetBoneDistance(entity, boneType, boneIndex)
    local bone = boneType == 1 and GetPedBoneIndex(entity, boneIndex --[[@as integer]]) or GetEntityBoneIndexByName(entity, boneIndex --[[@as string]])
    return #(GetWorldPositionOfEntityBone(entity, bone) - GetEntityCoords(aiLib.cache.ped))
end

-- Vehicles -------------------------------------------------------------------------------------------------------------

--- Vehicle properties in ox_lib's shape (the same keys as qb-core's; extras are 0 = on / 1 = off); nil without a vehicle.
---@param vehicle integer
---@return VehicleProperties|nil
function F.GetVehicleProperties(vehicle) return BridgeVehicleProps.get(vehicle) end

---@param vehicle integer
---@param props VehicleProperties
function F.SetVehicleProperties(vehicle, props)
    if not DoesEntityExist(vehicle) or type(props) ~= 'table' then return end
    BridgeVehicleProps.set(vehicle, props)
end

--- True when no vehicle stands within `radius` of `coords` (default the local ped).
---@param coords? vector3|table
---@param radius number
---@return boolean
function F.SpawnClear(coords, radius)
    return aiLib.isSpawnClear(origin(coords), radius)
end

---@param model integer
---@param coords vector4
---@return integer
local function localVehicle(model, coords)
    if not aiLib.requestModel(model, 5000) then return 0 end
    local vehicle = CreateVehicle(model, coords.x, coords.y, coords.z, coords.w, false, false)
    SetModelAsNoLongerNeeded(model)
    return vehicle
end

local warnedSpawn = false

--- qb-core's client spawn. A networked vehicle (the default) is made by the server through the
--- `QBCore:Server:SpawnVehicle` callback (the entity lockdown blocks client-made networked vehicles) and `cb` gets it
--- once it exists here; without an answer in 10 s a local vehicle only this player sees is made instead. Does not
--- wait: `cb` runs later.
---@param model string|integer
---@param cb? fun(vehicle: integer)
---@param coords? vector3|vector4|table
---@param isnetworked? boolean
---@param teleportInto? boolean
function F.SpawnVehicle(model, cb, coords, isnetworked, teleportInto)
    local hash = type(model) == 'string' and joaat(model) or model --[[@as integer]]
    if not IsModelInCdimage(hash) then return end
    local at = origin(coords)
    local spot = vector4(at.x, at.y, at.z, coords and coords.w or GetEntityHeading(aiLib.cache.ped))
    CreateThread(function()
        local vehicle = 0
        if isnetworked == nil or isnetworked then
            local p, settled = promise.new(), false
            BridgeClient.qbCallback('QBCore:Server:SpawnVehicle', function(netId)
                if settled then return end
                settled = true
                p:resolve(netId or false)
            end, hash, spot, teleportInto == true)
            SetTimeout(10000, function()
                if settled then return end
                settled = true
                p:resolve(false)
            end)
            local netId = Citizen.Await(p)
            if netId then vehicle = aiLib.waitForEntity(netId) end
            if vehicle == 0 and not warnedSpawn then
                warnedSpawn = true
                print(('^3[ai-core bridge] QBCore.Functions.SpawnVehicle (%s): the server did not spawn the vehicle, a local one is used^0'):format(invoker()))
            end
        end
        if vehicle == 0 then vehicle = localVehicle(hash, spot) end
        if vehicle == 0 then return end
        SetVehicleHasBeenOwnedByPlayer(vehicle, true)
        SetVehicleNeedsToBeHotwired(vehicle, false)
        SetVehRadioStation(vehicle, 'OFF')
        SetVehicleFuelLevel(vehicle, 100.0)
        if teleportInto then TaskWarpPedIntoVehicle(aiLib.cache.ped, vehicle, -1) end
        BridgeUI.call(cb, vehicle)
    end)
end

-- Command events (qb-core client/events.lua; sent by a server script, never by a local emit) -----------------------

aiLib.onServerEvent('QBCore:Command:TeleportToPlayer', function(coords)
    if type(coords) ~= 'table' and type(coords) ~= 'vector3' then return end
    aiLib.player.teleport(coords, { keepVehicle = true, fade = false })
end)

aiLib.onServerEvent('QBCore:Command:TeleportToCoords', function(x, y, z, h)
    if type(x) ~= 'number' or type(y) ~= 'number' then return end
    aiLib.player.teleport({ x = x, y = y, z = tonumber(z) }, { heading = tonumber(h), keepVehicle = true, fade = false })
end)

aiLib.onServerEvent('QBCore:Command:GoToMarker', function()
    local waypoint = aiLib.waypoint()
    if not waypoint then return end
    aiLib.player.teleport(waypoint, { keepVehicle = true })
end)

aiLib.onServerEvent('QBCore:Command:SpawnVehicle', function(vehName)
    if type(vehName) ~= 'string' then return end
    local ped = aiLib.cache.ped
    local current = GetVehiclePedIsUsing(ped)
    if current ~= 0 then F.DeleteVehicle(current) end
    F.SpawnVehicle(vehName, function(vehicle)
        SetVehicleDirtLevel(vehicle, 0.0)
        TriggerEvent('vehiclekeys:client:SetOwner', F.GetPlate(vehicle))
    end, F.GetCoords(ped), true, true)
end)

aiLib.onServerEvent('QBCore:Command:DeleteVehicle', function()
    local ped = aiLib.cache.ped
    local vehicle = GetVehiclePedIsUsing(ped)
    if vehicle ~= 0 then return F.DeleteVehicle(vehicle) end
    for _, other in ipairs(aiLib.entitiesInArea('vehicle', GetEntityCoords(ped), 5.0)) do F.DeleteVehicle(other) end
end)

---@param coords vector3
---@param text string
local function draw3DText(coords, text)
    local onScreen, x, y = World3dToScreen2d(coords.x, coords.y, coords.z)
    if not onScreen then return end
    local scale = 200 / (GetGameplayCamFov() * #(GetGameplayCamCoord() - coords))
    SetTextScale(1.0, 0.5 * scale)
    SetTextFont(4)
    SetTextColour(255, 255, 255, 255)
    SetTextEdge(2, 0, 0, 0, 150)
    SetTextProportional(true)
    SetTextOutline()
    SetTextCentre(true)
    BeginTextCommandDisplayText('STRING')
    AddTextComponentSubstringPlayerName(text)
    EndTextCommandDisplayText(x, y)
end

--- /me texts on screen: { sender server id, text, until (game timer) }; drawn each frame only while one shows.
---@type { sender: integer, text: string, untilAt: integer }[]
local meTexts = {}
---@type AiLibJob
local meJob
meJob = aiLib.every(0, function()
    local now = GetGameTimer()
    for i = #meTexts, 1, -1 do
        local entry = meTexts[i]
        local ped = aiLib.playerPed(entry.sender)
        if now > entry.untilAt then
            table.remove(meTexts, i)
        elseif ped ~= 0 then
            draw3DText(GetEntityCoords(ped), entry.text)
        end
    end
    if #meTexts == 0 then meJob:set(false) end
end, { active = false, name = 'qb:me' })

aiLib.onServerEvent('QBCore:Command:ShowMe3D', function(senderId, msg)
    if type(senderId) ~= 'number' or type(msg) ~= 'string' then return end
    meTexts[#meTexts + 1] = { sender = senderId, text = msg, untilAt = GetGameTimer() + 5000 }
    meJob:set(true)
end)

-- Vehicle enter / leave (qb-core fires them from baseevents through the server; here from ai-lib's cache) ---------

---@param vehicle integer
---@param seat integer
---@return table
local function vehicleInfo(vehicle, seat)
    return {
        vehicle = vehicle,
        seat = seat,
        name = GetDisplayNameFromVehicleModel(GetEntityModel(vehicle)),
        plate = F.GetPlate(vehicle),
        driver = GetPedInVehicleSeat(vehicle, -1),
        inseat = GetPedInVehicleSeat(vehicle, seat),
        haskeys = aiLib.vehicleKeys.has(vehicle),
    }
end

aiLib.cache.onChange('vehicle', function(vehicle, old)
    local seat = aiLib.cache.seat or -1
    if old and DoesEntityExist(old) then TriggerEvent('QBCore:Client:LeftVehicle', vehicleInfo(old, seat)) end
    if vehicle then
        -- The seat arrives right after the vehicle on the same watcher pass.
        SetTimeout(0, function()
            if aiLib.cache.vehicle == vehicle then TriggerEvent('QBCore:Client:EnteredVehicle', vehicleInfo(vehicle, aiLib.cache.seat or -1)) end
        end)
    end
end)
