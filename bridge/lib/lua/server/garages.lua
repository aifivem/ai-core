---Garages through ai-core's garage layer, whatever garage script runs; each answers only what it exposes.
local core = exports['ai-core']
return {
    ---Sends a vehicle (server entity) to the impound, or opens the script's impound form for `by`; false when nothing
    ---took it (delete it yourself).
    ---@return boolean
    impound = function(vehicle, by) return core:ImpoundVehicle(vehicle, by) end,
    ---Stores a vehicle in a garage (`garage` = the script's garage id, nil = its pick); false when nothing took it.
    ---@return boolean
    store = function(vehicle, garage, by) return core:StoreVehicleInGarage(vehicle, garage, by) end,
    ---Opens the garage menu of the active script for a player; false when it has none.
    ---@return boolean
    open = function(src, garage) return core:OpenGarage(src, garage) end,
    ---A player's vehicles in garages or the impound (`{ plate, model?, garage?, impounded }`), nil when the script
    ---cannot tell. Waits: call it from a thread.
    ---@return table[]?
    stored = function(src)
        local p = promise.new()
        local ok = pcall(core.GetGaragedVehicles, core, src, function(list) p:resolve(list) end)
        if not ok then return nil end
        return Citizen.Await(p)
    end,
    ---@return string?
    provider = function() return core:GetGarageSystem() end,
}
