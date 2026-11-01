---A vehicle's fuel (0-100) through ai-core's fuel layer, whatever fuel script runs (ai-fuel, ox_fuel, LegacyFuel...).
local core = exports['ai-core']
return {
    ---The level of a vehicle (server entity), nil when it has none.
    ---@param vehicle integer
    ---@return number?
    get = function(vehicle) return core:GetVehicleFuel(vehicle) end,
    ---Sets the level (clamped to 0-100); false for a wrong vehicle.
    ---@return boolean
    set = function(vehicle, level) return core:SetVehicleFuel(vehicle, level) end,
    ---The fuel script that answers, or nil.
    ---@return string?
    provider = function() return core:GetFuelSystem() end,
}
