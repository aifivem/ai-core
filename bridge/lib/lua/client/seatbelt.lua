---The local player's seat belt through ai-core, whatever seat belt script runs (ai-smallresources, a HUD's own).
return {
    ---Whether the belt is on; nil when no seat belt script answers (on demand, not per frame).
    ---@return boolean?
    isOn = function() return exports['ai-core']:GetSeatbelt() end,
    ---`fn(worn)` when the belt changes (scripts that tell changes: ai-smallresources, qbx_seatbelt).
    ---@param fn fun(worn: boolean?)
    onChange = function(fn) AddEventHandler('ai-core:client:seatbelt', fn) end,
    ---@return string?
    provider = function() return exports['ai-core']:GetSeatbeltProvider() end,
}
