-- The target script adapters of `targets` (lua/client/targets.lua), one per target, and the order they win in when
-- several run (`docs/compat/target.md`). Returns that list.

local resource = GetCurrentResourceName()

---@class AiLibTargetOption
---@field name string unique across resources (`<resource>:<prompt id>`)
---@field label string
---@field icon? string
---@field distance number
---@field canInteract fun(entity: integer): boolean
---@field onSelect fun(entity: integer)

---@param value any
---@return integer
local function entityOf(value)
    if type(value) == 'number' then return value end
    if type(value) == 'table' and type(value.entity) == 'number' then return value.entity end
    return 0
end

---`store` becomes `fa-solid fa-store`; a full class stays.
---@param icon string?
local function faClass(icon)
    if not icon or icon:find('fa-', 1, true) then return icon end
    return 'fa-solid fa-' .. icon
end

---@param c { x: number, y: number, z: number }
local function vec(c) return vector3(c.x + 0.0, c.y + 0.0, c.z + 0.0) end

---The ox_target option shape (sleepless_interact takes the same).
---@param o AiLibTargetOption
local function oxOption(o)
    return {
        name = o.name,
        label = o.label,
        icon = faClass(o.icon),
        distance = o.distance,
        canInteract = function(entity) return o.canInteract(entityOf(entity)) end,
        onSelect = function(data) o.onSelect(entityOf(data)) end,
    }
end

---The ox_target API answered under `name` (ox_target, ai-target, tgiann-target, tgiann-radialmenu-target).
---@param name string
local function oxApi(name)
    return {
        addSphere = function(coords, radius, o)
            return exports[name]:addSphereZone({ coords = vec(coords), radius = radius, options = { oxOption(o) } })
        end,
        removeZone = function(id) exports[name]:removeZone(id) end,
        addLocalEntity = function(entity, o) exports[name]:addLocalEntity(entity, { oxOption(o) }) end,
        removeLocalEntity = function(entity, o) exports[name]:removeLocalEntity(entity, o.name) end,
        addModels = function(models, o) exports[name]:addModel(models, { oxOption(o) }) end,
        removeModels = function(models, o) exports[name]:removeModel(models, o.name) end,
        addGlobalVehicle = function(o) exports[name]:addGlobalVehicle({ oxOption(o) }) end,
        removeGlobalVehicle = function(o) exports[name]:removeGlobalVehicle(o.name) end,
    }
end

-- sleepless_interact 2.x own API: options at coordinates instead of zones, the ox option shape.
local sleeplessInteract = {
    addSphere = function(coords, _, o) return exports.sleepless_interact:addCoords(vec(coords), { oxOption(o) }) end,
    removeZone = function(id, o) exports.sleepless_interact:removeCoords(id, o.name) end,
    addLocalEntity = function(entity, o) exports.sleepless_interact:addLocalEntity(entity, { oxOption(o) }) end,
    removeLocalEntity = function(entity, o) exports.sleepless_interact:removeLocalEntity(entity, o.name) end,
    addModels = function(models, o) exports.sleepless_interact:addModel(models, { oxOption(o) }) end,
    removeModels = function(models, o) exports.sleepless_interact:removeModel(models, o.name) end,
    addGlobalVehicle = function(o) exports.sleepless_interact:addGlobalVehicle({ oxOption(o) }) end,
    removeGlobalVehicle = function(o) exports.sleepless_interact:removeGlobalVehicle(o.name) end,
}

-- qb-target 5.x: options keyed by label, zones by a global name; it keeps a stopped resource's options, so this
-- resource takes its own off when it stops.
local qbLive = {}
AddEventHandler('onClientResourceStop', function(name)
    if name ~= resource then return end
    for _, remove in pairs(qbLive) do pcall(remove) end
end)
---@param key string
local function qbDrop(key)
    local remove = qbLive[key]
    qbLive[key] = nil
    if remove then remove() end
end
---@param o AiLibTargetOption
local function qbParams(o)
    return {
        distance = o.distance,
        options = { {
            label = o.label,
            icon = faClass(o.icon),
            action = function(entity) o.onSelect(entityOf(entity)) end,
            canInteract = function(entity) return o.canInteract(entityOf(entity)) end,
        } },
    }
end
local qbTarget = {
    addSphere = function(coords, radius, o)
        exports['qb-target']:AddCircleZone(o.name, vec(coords), radius, { name = o.name, useZ = true, debugPoly = false }, qbParams(o))
        qbLive['z:' .. o.name] = function() exports['qb-target']:RemoveZone(o.name) end
        return o.name
    end,
    removeZone = function(_, o) qbDrop('z:' .. o.name) end,
    addLocalEntity = function(entity, o)
        exports['qb-target']:AddTargetEntity(entity, qbParams(o))
        qbLive[('e:%d:%s'):format(entity, o.name)] = function() exports['qb-target']:RemoveTargetEntity(entity, o.label) end
    end,
    removeLocalEntity = function(entity, o) qbDrop(('e:%d:%s'):format(entity, o.name)) end,
    addModels = function(models, o)
        exports['qb-target']:AddTargetModel(models, qbParams(o))
        qbLive['m:' .. o.name] = function() exports['qb-target']:RemoveTargetModel(models, o.label) end
    end,
    removeModels = function(_, o) qbDrop('m:' .. o.name) end,
    addGlobalVehicle = function(o)
        exports['qb-target']:AddGlobalVehicle(qbParams(o))
        qbLive['v:' .. o.name] = function() exports['qb-target']:RemoveGlobalVehicle(o.label) end
    end,
    removeGlobalVehicle = function(o) qbDrop('v:' .. o.name) end,
}

-- interact (darktrovx): world bubbles with options, removed by id.
---@param o AiLibTargetOption
local function interactData(o, extra)
    local data = {
        id = o.name,
        interactDst = o.distance,
        options = { {
            label = o.label,
            action = function(entity) o.onSelect(entityOf(entity)) end,
            canInteract = function(entity) return o.canInteract(entityOf(entity)) end,
        } },
    }
    for k, v in pairs(extra or {}) do data[k] = v end
    return data
end
---@param model string|integer
local function hashOf(model) return type(model) == 'number' and model or joaat(model) end
local interact = {
    addSphere = function(coords, _, o)
        exports.interact:AddInteraction(interactData(o, { coords = vec(coords) }))
        return o.name
    end,
    removeZone = function(_, o) exports.interact:RemoveInteraction(o.name) end,
    addLocalEntity = function(entity, o) exports.interact:AddLocalEntityInteraction(interactData(o, { entity = entity })) end,
    removeLocalEntity = function(entity, o) exports.interact:RemoveLocalEntityInteraction(entity, o.name) end,
    addModels = function(models, o)
        for _, model in ipairs(models) do exports.interact:AddModelInteraction(interactData(o, { model = hashOf(model) })) end
    end,
    removeModels = function(models, o)
        for _, model in ipairs(models) do exports.interact:RemoveModelInteraction(hashOf(model), o.name) end
    end,
    addGlobalVehicle = function(o) exports.interact:AddGlobalVehicleInteraction(interactData(o)) end,
    removeGlobalVehicle = function(o) exports.interact:RemoveGlobalVehicleInteraction(o.name) end,
}

-- Win order: ai-target, then TGIANN, then the others; scripts that `provide` ox_target / qb-target come before those
-- names (a provided name reads started too); interact last (it often runs next to a target for other scripts).
local LIST = {
    { resource = 'ai-target', adapter = oxApi('ai-target') },
    -- Answers the ox_target API under `tgiann-target` and `ox_target`, not under its own name.
    { resource = 'tgiann-radialmenu-target', adapter = oxApi('tgiann-target') },
    { resource = 'tgiann-target', adapter = oxApi('tgiann-target') },
    { resource = 'sleepless_interact', adapter = sleeplessInteract },
    { resource = 'ox_target', adapter = oxApi('ox_target') },
    { resource = 'qb-target', adapter = qbTarget },
    { resource = 'interact', adapter = interact },
}

return LIST
