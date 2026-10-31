-- Points on world objects of some models (used through `Points:addModel`), like the TypeScript lib's model points:
-- a target option on the models in target mode, otherwise a prompt near the closest one. One scan for the resource,
-- two times a second, only while model points exist. Vehicle models scan the vehicle pool (the object scan never
-- finds vehicles).

local TARGET = 'ox_target'
local SCAN_MS = 500
-- Up to this many models a point asks GTA for the closest object of each; more models use the object index (one
-- closest-object query per model and scan costs milliseconds with hundreds of models).
local DIRECT_MODELS = 6
local INDEX_CHUNK = 300
local index = { candidates = {}, pool = {}, next = 1, found = {} }

---Walks a chunk of the object pool and keeps the objects of the wanted models; a full walk replaces the candidates.
---@param wanted table<integer, boolean>
local function advanceIndex(wanted)
    if index.next > #index.pool then
        index.candidates = index.found
        index.found = {}
        index.pool = GetGamePool('CObject')
        index.next = 1
    end
    local last = math.min(#index.pool, index.next + INDEX_CHUNK - 1)
    for i = index.next, last do
        local entity = index.pool[i]
        if entity and wanted[GetEntityModel(entity)] then index.found[#index.found + 1] = entity end
    end
    index.next = last + 1
end
---@type table<table, boolean>
local scanning = {}
local byPrompt = {}
local busy = false

---@param point table
---@param entity integer
local function allowed(point, entity)
    if not point.options.canShow then return true end
    local ok, result = pcall(point.options.canShow, entity)
    return ok and result ~= false
end

---@param point table
---@param entity integer
local function run(point, entity)
    if busy or entity == 0 or not allowed(point, entity) then return end
    busy = true
    local ok, err = pcall(point.options.onPressed, entity)
    busy = false
    if not ok then print(('^1[%s] model point onPressed failed: %s^0'):format(GetCurrentResourceName(), err)) end
end

---@param point table
---@param text string?
local function show(point, text)
    if text == point.shown then return end
    point.shown = text
    if text then exports['ai-lib']:ShowPrompt(point.promptId, text) else exports['ai-lib']:HidePrompt(point.promptId) end
end

---@param point table
---@param x number
---@param y number
---@param z number
---@return integer
local function nearest(point, x, y, z)
    local radius = point.options.radius or 1.5
    if point.options.vehicles then
        local best, bestDist = 0, radius
        for _, vehicle in ipairs(GetGamePool('CVehicle')) do
            if (point.global and NetworkGetEntityIsNetworked(vehicle)) or point.hashSet[GetEntityModel(vehicle)] then
                local d = #(GetEntityCoords(vehicle) - vector3(x, y, z))
                if d < bestDist then best, bestDist = vehicle, d end
            end
        end
        return best
    end
    if #point.hashes > DIRECT_MODELS then
        local best, bestDist = 0, radius
        for _, entity in ipairs(index.candidates) do
            if DoesEntityExist(entity) and point.hashSet[GetEntityModel(entity)] then
                local d = #(GetEntityCoords(entity) - vector3(x, y, z))
                if d < bestDist then best, bestDist = entity, d end
            end
        end
        return best
    end
    for _, hash in ipairs(point.hashes) do
        local found = GetClosestObjectOfType(x, y, z, radius, hash, false, false, false)
        if found ~= 0 then return found end
    end
    return 0
end

-- While the player stands still (and stays in or out of a vehicle) a scan is skipped, at most IDLE_SCANS in a row.
local IDLE_SCANS = 6
local lastPos, lastInVehicle, idle = vector3(0, 0, 0), false, IDLE_SCANS

local function scan()
    local pos = GetEntityCoords(aiLib.cache.ped)
    local inVehicle = aiLib.cache.vehicle ~= false
    idle = idle + 1
    if inVehicle == lastInVehicle and #(pos - lastPos) < 1.0 and idle < IDLE_SCANS then return end
    lastPos, lastInVehicle, idle = pos, inVehicle, 0
    local wanted, any = {}, false
    for point in pairs(scanning) do
        local skip = inVehicle and not point.options.vehicles and not point.options.inVehicle
        if not skip and not point.options.vehicles and #point.hashes > DIRECT_MODELS then
            for hash in pairs(point.hashSet) do wanted[hash] = true end
            any = true
        end
    end
    if any then advanceIndex(wanted) end
    for point in pairs(scanning) do
        if inVehicle and not point.options.vehicles and not point.options.inVehicle then
            point.entity = 0
            show(point, nil)
        else
            local found = nearest(point, pos.x, pos.y, pos.z)
            point.entity = found
            show(point, found ~= 0 and allowed(point, found) and point.options.label or nil)
        end
    end
end

-- One scan job for the resource, two times a second, only while model points in prompt mode exist.
local scanner = aiLib.every(SCAN_MS, scan, { active = false, name = 'modelPoints' })

---@param point table
---@param mode 'prompt'|'target'
local function attach(point, mode)
    if mode == 'target' then
        local option = {
            name = point.promptId,
            label = point.options.label,
            icon = point.options.icon,
            distance = point.options.radius or 1.5,
            canInteract = function(entity) return allowed(point, entity) end,
            onSelect = function(data) run(point, type(data) == 'table' and data.entity or 0) end,
        }
        if point.global then
            exports[TARGET]:addGlobalVehicle({ option })
        else
            exports[TARGET]:addModel(point.options.models, { option })
        end
        point.attached = true
        return
    end
    scanning[point] = true
    if not scanner.running then
        idle = IDLE_SCANS
        scanner:set(true)
    end
end

---@param point table
local function detach(point)
    if point.attached and GetResourceState(TARGET) == 'started' then
        if point.global then
            exports[TARGET]:removeGlobalVehicle(point.promptId)
        else
            exports[TARGET]:removeModel(point.options.models, point.promptId)
        end
    end
    point.attached = false
    scanning[point] = nil
    if not next(scanning) then scanner:set(false) end
    show(point, nil)
    point.entity = 0
end

local ModelPoints = {}

---@param promptId string
---@param options table
---@param mode 'prompt'|'target'
---@return table
function ModelPoints.add(promptId, options, mode)
    local hashes, hashSet = {}, {}
    for i, model in ipairs(options.models) do
        local hash = type(model) == 'number' and model or GetHashKey(model)
        hashes[i] = hash
        hashSet[hash] = true
    end
    -- No models on a vehicle point: every networked vehicle (`Points:addVehicle`).
    local global = options.vehicles == true and #options.models == 0
    local point = { promptId = promptId, options = options, hashes = hashes, hashSet = hashSet, entity = 0, global = global }
    byPrompt[promptId] = point
    attach(point, mode)
    return point
end

---@param point table
function ModelPoints.remove(point)
    byPrompt[point.promptId] = nil
    detach(point)
end

---@param point table
---@param mode 'prompt'|'target'
function ModelPoints.restyle(point, mode)
    detach(point)
    attach(point, mode)
end

---The interaction key on a model point's prompt.
---@param promptId string
function ModelPoints.press(promptId)
    local point = byPrompt[promptId]
    if point then run(point, point.entity) end
end

return ModelPoints
