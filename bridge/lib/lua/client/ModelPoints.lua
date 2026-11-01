-- Points on world objects of some models (used through `Points:addModel`), like the TypeScript lib's model points:
-- a target option on the models in target mode, otherwise a prompt near the closest one. One scan for the resource,
-- two times a second, only while model points exist. Vehicle models scan the vehicle pool (the object scan never
-- finds vehicles).

local targets = aiLib.targets
local resource = GetCurrentResourceName()
local SCAN_MS = 500
-- The closest object or vehicle of a point's models: lua/client/ModelPoints/nearest.lua.
local nearest, advanceIndex, DIRECT_MODELS = aiLib.loadPart('ModelPoints/nearest')

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

---Points with `promptOnly` / `preferTarget` keep their own style (same rule as `Points`).
---@param options { promptOnly?: boolean, preferTarget?: boolean }
---@param mode 'prompt'|'target'
---@return 'prompt'|'target'
local function pointStyle(options, mode)
    if options.promptOnly then return 'prompt' end
    if options.preferTarget and targets.active() ~= nil then return 'target' end
    return mode
end

---@param point table
---@param mode 'prompt'|'target'
local function attach(point, mode)
    local target = targets.active()
    if target and pointStyle(point.options, mode) == 'target' then
        ---@type AiLibTargetOption
        local option = {
            name = resource .. ':' .. point.promptId,
            label = point.options.label,
            icon = point.options.icon,
            distance = point.options.radius or 1.5,
            canInteract = function(entity) return allowed(point, entity) end,
            onSelect = function(entity) run(point, entity) end,
        }
        local models = point.options.models
        if point.global then
            point.registration = targets.register(target,
                function(a) a.addGlobalVehicle(option) end,
                function(a) a.removeGlobalVehicle(option) end)
        else
            point.registration = targets.register(target,
                function(a) a.addModels(models, option) end,
                function(a) a.removeModels(models, option) end)
        end
        -- Not ready yet (client still loading): a prompt until the target starts and restyles every point.
        if point.registration then return end
    end
    scanning[point] = true
    if not scanner.running then
        idle = IDLE_SCANS
        scanner:set(true)
    end
end

---@param point table
local function detach(point)
    targets.unregister(point.registration)
    point.registration = nil
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
