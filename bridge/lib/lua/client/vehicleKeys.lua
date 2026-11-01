---Vehicle keys of the local player through ai-core's client key layer.
return {
    ---Whether the player holds a vehicle's keys (entity or plate), from ai-core's short-lived mirror of the server's
    ---answers: a vehicle the player never entered answers false once while ai-core asks the server.
    ---@param vehicle integer | string
    ---@return boolean
    has = function(vehicle) return exports['ai-core']:HasVehicleKeys(vehicle) == true end,
}
