-- QBCore.Functions particles (local effects, as in qb-core).

local F = QBCore.Functions
local origin = BridgeQBClient.origin

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
