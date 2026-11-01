-- QBCore.Shared on ai-core, both sides (loaded after bridge/qb/server/core.lua and client/player.lua define QBCore):
-- QB's helper functions, starter items, vehicles and weapons. Jobs, gangs and items come from ai-core
-- (server/core.lua and client/shared_data.lua fill them).
-- The helpers and starter items are copied from qb-core (https://github.com/qbcore-framework/qb-core, GPL-3.0);
-- vehicles and weapons are qbx_core's tables ai-core ships (`BridgeShapes.sharedData`).

local Shared = QBCore.Shared

--- qb-core 1.3: jobs start on their default duty at login. ai-core decides duty itself (panel `restoreDuty`).
Shared.ForceJobDefaultDutyAtLogin = true

Shared.StarterItems = {
    ['phone'] = { amount = 1, item = 'phone' },
    ['id_card'] = { amount = 1, item = 'id_card' },
    ['driver_license'] = { amount = 1, item = 'driver_license' },
}

local StringCharset = {}
local NumberCharset = {}
for i = 48, 57 do NumberCharset[#NumberCharset + 1] = string.char(i) end
for i = 65, 90 do StringCharset[#StringCharset + 1] = string.char(i) end
for i = 97, 122 do StringCharset[#StringCharset + 1] = string.char(i) end

---@param length integer
---@return string
function Shared.RandomStr(length)
    local out = {}
    for i = 1, length do out[i] = StringCharset[math.random(1, #StringCharset)] end
    return table.concat(out)
end

---@param length integer
---@return string
function Shared.RandomInt(length)
    local out = {}
    for i = 1, length do out[i] = NumberCharset[math.random(1, #NumberCharset)] end
    return table.concat(out)
end

---@param str string
---@param delimiter string
---@return string[]
function Shared.SplitStr(str, delimiter)
    local result = {}
    local from = 1
    local delimFrom, delimTo = string.find(str, delimiter, from)
    while delimFrom do
        result[#result + 1] = string.sub(str, from, delimFrom - 1)
        from = delimTo + 1
        delimFrom, delimTo = string.find(str, delimiter, from)
    end
    result[#result + 1] = string.sub(str, from)
    return result
end

---@param value? string
---@return string?
function Shared.Trim(value)
    if not value then return nil end
    return (string.gsub(value, '^%s*(.-)%s*$', '%1'))
end

---@param value? string
---@return string?
function Shared.FirstToUpper(value)
    if not value then return nil end
    return (value:gsub('^%l', string.upper))
end

---@param value number
---@param numDecimalPlaces? integer
---@return number
function Shared.Round(value, numDecimalPlaces)
    return aiLib.numbers.round(value, numDecimalPlaces)
end

---@param value any
---@return boolean
function Shared.IsFunction(value)
    return (IsDuplicityVersion() and BridgeQB or BridgeUI).isCallable(value)
end

-- Vehicle extras are client natives; qb-core loads these helpers on both sides, so they exist here too.
---@param vehicle integer
---@param extra integer
---@param enable boolean
function Shared.ChangeVehicleExtra(vehicle, extra, enable)
    if not DoesExtraExist(vehicle, extra) then return end
    SetVehicleExtra(vehicle, extra, not enable)
end

---@param vehicle integer
---@param config table<string|integer, boolean>
function Shared.SetDefaultVehicleExtras(vehicle, config)
    for i = 1, 20 do
        if DoesExtraExist(vehicle, i) then SetVehicleExtra(vehicle, i, true) end
    end
    for id, enabled in pairs(config) do
        Shared.ChangeVehicleExtra(vehicle, tonumber(id) --[[@as integer]], type(enabled) ~= 'boolean' or enabled)
    end
end

local function set(list)
    local out = {}
    for _, v in ipairs(list) do out[v] = true end
    return out
end

Shared.MaleNoGloves = set({ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 18, 26, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 112, 113, 114, 118, 125, 132 })
Shared.FemaleNoGloves = set({ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 19, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 129, 130, 131, 135, 142, 149, 153, 157, 161, 165 })

-- QB's vehicle table keyed by model (with `spawncode` and `shop`) and by hash; QB's weapon table keyed by hash.
Shared.Vehicles = {}
Shared.VehicleHashes = {}
for model, vehicle in pairs(BridgeShapes.sharedData('vehicles')) do
    local entry = {
        spawncode = model, name = vehicle.name, brand = vehicle.brand, model = model, price = vehicle.price,
        category = vehicle.category, hash = vehicle.hash or joaat(model), type = vehicle.type or 'automobile', shop = vehicle.shop or 'pdm',
    }
    Shared.Vehicles[model] = entry
    Shared.VehicleHashes[entry.hash] = entry
end
Shared.Weapons = BridgeShapes.sharedData('weapons')
