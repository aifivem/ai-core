---Props made by this resource's `attachProp` (entity -> model, so a reused handle is never deleted).
---@type table<integer, integer>
local props = {}
local RESOURCE = GetCurrentResourceName()

AddEventHandler('onClientResourceStop', function(name)
    if name ~= RESOURCE then return end
    for prop, model in pairs(props) do
        if DoesEntityExist(prop) and GetEntityModel(prop) == model then DeleteEntity(prop) end
    end
end)

---@class AiLibAttachPropOptions
---@field ped? integer the ped that holds it (default the local ped)
---@field bone integer ped bone id (`57005` right hand)
---@field offset? vector3|{ x: number, y: number, z: number }
---@field rotation? vector3|{ x: number, y: number, z: number }
---@field collision? boolean the prop collides (default false)
---@field rotationOrder? integer `AttachEntityToEntity`'s rotation order (default 2)

---A local prop held by a ped at a bone: the entity, or 0 when the model does not load or the ped is gone. The caller
---deletes it (`DeleteEntity`); whatever is left goes when the resource stops. Call from a thread.
---@param model string|integer
---@param options AiLibAttachPropOptions
---@return integer
return function(model, options)
    local hash = aiLib.requestModel(model)
    local ped = options.ped or aiLib.cache.ped
    if not hash then return 0 end
    if not DoesEntityExist(ped) then
        SetModelAsNoLongerNeeded(hash)
        return 0
    end
    local at = GetEntityCoords(ped)
    local prop = CreateObject(hash, at.x, at.y, at.z, false, false, false)
    SetModelAsNoLongerNeeded(hash)
    local collision = options.collision == true
    if not collision then SetEntityCollision(prop, false, false) end
    local o = options.offset or vector3(0.0, 0.0, 0.0)
    local r = options.rotation or vector3(0.0, 0.0, 0.0)
    AttachEntityToEntity(prop, ped, GetPedBoneIndex(ped, options.bone), o.x, o.y, o.z, r.x, r.y, r.z, true, true,
        collision, false, options.rotationOrder or 2, true)
    for made, m in pairs(props) do
        if not DoesEntityExist(made) or GetEntityModel(made) ~= m then props[made] = nil end
    end
    props[prop] = GetEntityModel(prop)
    return prop
end
