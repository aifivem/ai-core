---Door locks through ai-core's door lock layer, by the active door lock script's own door id.
local core = exports['ai-core']
return {
    ---Locks or unlocks a door; `by` = the player acting (scripts without a server API need one). False when nothing took it.
    ---@param id string
    ---@param locked boolean
    ---@param by? integer
    ---@return boolean
    setLocked = function(id, locked, by) return core:SetDoorLocked(id, locked, by) end,
    ---Whether a door is locked; nil when unknown.
    ---@return boolean?
    isLocked = function(id) return core:IsDoorLocked(id) end,
    ---@return string?
    provider = function() return core:GetDoorlockSystem() end,
}
