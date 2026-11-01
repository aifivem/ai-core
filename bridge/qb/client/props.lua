-- QBCore.Functions props held at ped bones and bone lookups.

local F = QBCore.Functions
local invoker = BridgeQBClient.invoker

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
