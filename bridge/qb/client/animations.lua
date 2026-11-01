-- The rest of qb-core's client/functions.lua and client/events.lua (bridge/qb/client/animations.lua to commands.lua),
-- mapped onto ai-lib's helpers; plain native code copied from qb-core 1.3.0 (GPL-3.0). This file: animations, and
-- the helpers the files after it share (`BridgeQBClient.origin`, `BridgeQBClient.invoker`).

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

BridgeQBClient.origin = origin
BridgeQBClient.invoker = invoker
