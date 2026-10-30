-- The local player's often read values, kept current by ai-core's one watcher (local event `ai-core:client:cache`):
-- read `aiLib.cache.ped` instead of calling PlayerPedId() in loops. `false` = no vehicle / seat / weapon.

local UNARMED = `WEAPON_UNARMED`

---@class AiLibCache
---@field ped integer
---@field playerId integer
---@field serverId integer
---@field vehicle integer|false
---@field seat integer|false
---@field weapon integer|false
local cache = {}
---@type table<string, fun(value: any, old: any)[]>
local handlers = {}

local function readNow()
    local ped = PlayerPedId()
    local vehicle = GetVehiclePedIsIn(ped, false)
    ---@type integer|false
    local seat = false
    if vehicle ~= 0 then
        for i = -1, GetVehicleMaxNumberOfPassengers(vehicle) - 1 do
            if GetPedInVehicleSeat(vehicle, i) == ped then
                seat = i
                break
            end
        end
    end
    local weapon = GetSelectedPedWeapon(ped)
    cache.ped = ped
    cache.playerId = PlayerId()
    cache.serverId = GetPlayerServerId(PlayerId())
    cache.vehicle = vehicle ~= 0 and vehicle or false
    cache.seat = seat
    cache.weapon = weapon ~= UNARMED and weapon or false
end
readNow()

AddEventHandler('ai-core:client:cache', function(key, value)
    if cache[key] == nil or cache[key] == value then return end
    local old = cache[key]
    cache[key] = value
    for _, handler in ipairs(handlers[key] or {}) do handler(value, old) end
end)

---Runs `handler(value, old)` whenever a cached value changes (entering a vehicle, a new ped after a model swap...).
---@param key 'ped'|'vehicle'|'seat'|'weapon'
---@param handler fun(value: any, old: any)
function cache.onChange(key, handler)
    handlers[key] = handlers[key] or {}
    table.insert(handlers[key], handler)
end

return cache
