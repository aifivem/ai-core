---Vehicle keys through ai-core's key layer (whatever key system runs). `vehicle` is a server entity or a plate;
---`purpose`: `purchase`, `garage`, `job`, `rental`, `temporary` (default).
local core = exports['ai-core']
return {
    give = function(src, vehicle, purpose) core:GiveVehicleKeys(src, vehicle, purpose or 'temporary') end,
    remove = function(src, vehicle) core:RemoveVehicleKeys(src, vehicle) end,
    has = function(src, vehicle) return core:HasVehicleKeys(src, vehicle) end,
}
