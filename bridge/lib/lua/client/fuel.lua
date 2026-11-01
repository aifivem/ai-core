---A vehicle's fuel on the client through ai-core's fuel layer: the server keeps the `fuel` bag for every fuel script,
---so this is a memory read; the game's tank level without one.
return {
    ---0-100 for a vehicle this client knows.
    ---@param vehicle integer
    ---@return number
    get = function(vehicle)
        local level = Entity(vehicle).state.fuel
        if type(level) == 'number' then return level end
        return GetVehicleFuelLevel(vehicle)
    end,
}
