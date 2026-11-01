-- Server vehicles the same way as the TypeScript lib's `spawnVehicle`: created on the server (strict entity lockdown),
-- set up in one call, the look applied by ai-core on the entity owner's client from the same state bags.

---@param vehicle integer
---@param src integer
---@param seat integer
local function seatPlayer(vehicle, src, seat)
    local ped = GetPlayerPed(src)
    if ped == 0 then return end
    aiLib.waitFor(function()
        if not DoesEntityExist(vehicle) or GetPedInVehicleSeat(vehicle, seat) == ped then return true end
        SetPedIntoVehicle(ped, vehicle, seat)
        return nil
    end, 2000, 150)
end

---@class AiLibSpawnVehicleOptions
---@field model string|integer model name or hash
---@field coords vector4|{x: number, y: number, z: number, w?: number, heading?: number}
---@field asker? integer a player whose client tells the spawn type; without it `type` or `automobile`
---@field type? string
---@field plate? string up to 8 characters
---@field fuel? number 0-100
---@field keysTo? integer gets the keys through ai-core's key layer
---@field purpose? 'purchase'|'garage'|'job'|'rental'|'temporary'
---@field driver? integer put into the driver seat
---@field seats? { source: integer, seat: integer }[]
---@field props? table stored VehicleProps
---@field setup? { maxed?: boolean, primary?: integer[], secondary?: integer[], livery?: integer, windowTint?: integer, dirt?: integer, engineOn?: boolean }
---@field locked? boolean
---@field bucket? integer
---@field persistent? boolean stays when its owner leaves (default true)
---@field bags? table<string, any> replicated state bag values

local LETTERS = 'ABCDEFGHJKLMNPRSTUVWXYZ'

---A plate like the game's own: two digits, three letters, three digits.
---@return string
local function randomPlate()
    local function letter()
        local i = math.random(#LETTERS)
        return LETTERS:sub(i, i)
    end
    return ('%d%d%s%s%s%d%d%d'):format(math.random(0, 9), math.random(0, 9), letter(), letter(), letter(),
        math.random(0, 9), math.random(0, 9), math.random(0, 9))
end

---Creates a networked vehicle and sets it up: plate, fuel, look, lock, bucket, keys, driver and passengers. Returns
---the entity, or nil when the model does not exist or creation failed. Call from a thread.
---@param options AiLibSpawnVehicleOptions
---@return integer?
return function(options)
    local model = options.model
    local hash = type(model) == 'number' and model or GetHashKey(model --[[@as string]])
    ---@type string?
    local kind = options.type or 'automobile'
    if options.asker then
        kind, hash = aiLib.vehicleType(model, options.asker)
        if not kind then return nil end
    end
    local c = options.coords
    local vehicle = CreateVehicleServerSetter(hash, kind, c.x, c.y, c.z, c.w or c.heading or 0.0)
    if not aiLib.waitFor(function() return DoesEntityExist(vehicle) or nil end, 5000) then return nil end
    if options.persistent ~= false then SetEntityOrphanMode(vehicle, 2) end
    -- The server reads the plate only after the owner client's first sync: always set one, so keys never go to an
    -- empty plate.
    local plate = (options.plate or randomPlate()):sub(1, 8)
    SetVehicleNumberPlateText(vehicle, plate)
    if options.bucket then SetEntityRoutingBucket(vehicle, options.bucket) end
    if options.locked then SetVehicleDoorsLocked(vehicle, 2) end
    local state = Entity(vehicle).state
    -- Through ai-core's fuel layer: a fuel script that keeps fuel on clients gets it from the entity's owner.
    if options.fuel then exports['ai-core']:SetVehicleFuel(vehicle, options.fuel) end
    if options.props then state:set('ai:props', options.props, true) end
    if options.setup then state:set('ai:setup', options.setup, true) end
    for key, value in pairs(options.bags or {}) do state:set(key, value, true) end
    if options.keysTo then
        local trimmed = plate:match('^%s*(.-)%s*$')
        local synced = aiLib.waitFor(function()
            return (not DoesEntityExist(vehicle) or GetVehicleNumberPlateText(vehicle):match('^%s*(.-)%s*$') == trimmed)
                or nil
        end, 3000)
        aiLib.vehicleKeys.give(options.keysTo, synced and DoesEntityExist(vehicle) and vehicle or trimmed,
            options.purpose)
    end
    if options.driver then seatPlayer(vehicle, options.driver, -1) end
    for _, rider in ipairs(options.seats or {}) do seatPlayer(vehicle, rider.source, rider.seat) end
    return vehicle
end
