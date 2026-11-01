-- Vehicles (created on the server through ai-lib's `spawnVehicle`) and qb-core's vehicle callbacks.

local playerId, vec3 = BridgeQB.playerId, BridgeQB.vec3

---@param source? integer
---@param model string|integer
---@param coords? vector3|vector4|table
---@param warp? boolean
---@param kind? string the CreateVehicleServerSetter type; nil asks the player's client
---@param keys? boolean gives the player temporary keys
---@return integer vehicle the vehicle (0 when it could not be created)
local function spawn(source, model, coords, warp, kind, keys)
    if type(model) == 'number' then
        local entry = QBCore.Shared.VehicleHashes[model]
        model = entry and entry.model
    end
    if type(model) ~= 'string' or not model:match('^[%w_]+$') then return 0 end
    local id = playerId(source)
    local position
    if coords ~= nil then
        local at = vec3(coords)
        if not at then return 0 end
        local heading = coords.w
        if type(coords) == 'table' then heading = heading or coords.heading or coords.h end
        position = { x = at.x, y = at.y, z = at.z, w = tonumber(heading) or 0.0 }
    else
        local ped = id and GetPlayerPed(id) or 0
        if ped == 0 then return 0 end
        local at = GetEntityCoords(ped)
        position = { x = at.x, y = at.y, z = at.z, w = GetEntityHeading(ped) }
    end
    local vehicle = aiLib.spawnVehicle({
        model = model,
        coords = position,
        asker = kind == nil and id or nil,
        type = kind,
        driver = warp and id or nil,
        keysTo = keys and id or nil,
        purpose = keys and 'temporary' or nil,
    })
    return vehicle or 0
end

--- qb-core's server vehicle (the type asked from the player's client).
---@param source integer
---@param model string|integer
---@param coords? vector3|vector4
---@param warp? boolean
---@return integer
function QBCore.Functions.SpawnVehicle(source, model, coords, warp)
    return spawn(source, model, coords, warp, nil, false)
end

---@param source integer
---@param model string|integer
---@param coords? vector3|vector4
---@param warp? boolean
---@return integer
function QBCore.Functions.CreateAutomobile(source, model, coords, warp)
    return spawn(source, model, coords, warp, 'automobile', false)
end

---@param source integer
---@param model string|integer
---@param vehtype string automobile, bike, boat, heli, plane, submarine, trailer or train
---@param coords? vector3|vector4
---@param warp? boolean
---@return integer
function QBCore.Functions.CreateVehicle(source, model, vehtype, coords, warp)
    return spawn(source, model, coords, warp, type(vehtype) == 'string' and vehtype or 'automobile', false)
end

-- qb-core's own vehicle callbacks (its admin `/car`): ai-core admins only; the spawned car's keys go to the admin.
for name, kind in pairs({ ['QBCore:Server:SpawnVehicle'] = false, ['QBCore:Server:CreateVehicle'] = 'automobile' }) do
    QBCore.Functions.CreateCallback(name, function(source, cb, model, coords, warp)
        if not Bridge.isAdmin(source) or type(model) ~= 'string' or (coords ~= nil and not vec3(coords)) then return cb(nil) end
        local vehicle = spawn(source, model, coords, warp == true, kind or nil, true)
        cb(vehicle ~= 0 and DoesEntityExist(vehicle) and NetworkGetNetworkIdFromEntity(vehicle) or nil)
    end)
end
