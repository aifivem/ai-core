-- The local player's ped, like the TypeScript lib's `player`: reads use `aiLib.cache`, actions read the ped fresh.

local player = {}

---@return vector3
function player.coords() return GetEntityCoords(aiLib.cache.ped) end

---@return number
function player.heading() return GetEntityHeading(aiLib.cache.ped) end

---Metres from the player to a point.
---@param point vector3|{x: number, y: number, z: number}
---@return number
function player.distanceTo(point)
    return #(GetEntityCoords(aiLib.cache.ped) - vector3(point.x, point.y, point.z))
end

---@param frozen boolean
function player.freeze(frozen) FreezeEntityPosition(PlayerPedId(), frozen) end

---Streams the area by standing the (frozen) entity at rising heights until the game knows the ground; nil if never.
---@param entity integer
---@param x number
---@param y number
---@return number?
local function findGround(entity, x, y)
    for height = 0, 1000, 25 do
        SetEntityCoordsNoOffset(entity, x, y, height + 0.0, false, false, false)
        RequestCollisionAtCoord(x, y, height + 0.0)
        Wait(50)
        local found, groundZ = GetGroundZFor_3dCoord(x, y, height + 0.0, false)
        if found then return groundZ end
    end
end

---Moves the player (and their vehicle with `keepVehicle`) behind a fade, waiting for the collision there. `ground`
---(default true) puts the feet on `to.z` (panel points); `ground = 'find'` or a missing `z` searches the ground under
---x / y (map waypoint). Call from a thread.
---@param to vector3|{x: number, y: number, z?: number}
---@param options? { heading?: number, ground?: boolean|'find', fade?: boolean, keepVehicle?: boolean }
function player.teleport(to, options)
    options = options or {}
    local fade = options.fade ~= false
    if fade then aiLib.fadeOut() end
    local ped = PlayerPedId()
    local vehicle = options.keepVehicle and GetVehiclePedIsIn(ped, false) or 0
    local entity = vehicle ~= 0 and vehicle or ped
    local z, ground = to.z, options.ground
    if z == nil or ground == 'find' then
        FreezeEntityPosition(entity, true)
        z = (findGround(entity, to.x, to.y) or 0.0) + 1.0
        FreezeEntityPosition(entity, false)
        ground = false
    end
    RequestCollisionAtCoord(to.x, to.y, z)
    SetEntityCoords(entity, to.x, to.y, ground == false and z or z - 1.0, false, false, false, false)
    if options.heading then SetEntityHeading(entity, options.heading) end
    aiLib.waitFor(function() return HasCollisionLoadedAroundEntity(entity) or nil end, 3000)
    if fade then DoScreenFadeIn(300) end
end

---Plays an animation on the player (loads the dict first). Flag 49 (default): upper body, loop, can move.
---@param dict string
---@param clip string
---@param options? { flag?: integer, duration?: integer, blendIn?: number, blendOut?: number }
function player.playAnim(dict, clip, options)
    options = options or {}
    if not aiLib.requestAnimDict(dict) then return end
    TaskPlayAnim(PlayerPedId(), dict, clip, options.blendIn or 8.0, options.blendOut or -8.0, options.duration or -1, options.flag or 49, 0, false, false, false)
end

function player.stopAnim() ClearPedTasks(PlayerPedId()) end

return player
