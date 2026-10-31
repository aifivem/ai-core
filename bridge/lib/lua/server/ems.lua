-- Medics through ai-core's EMS layer, like the TypeScript lib's `ems`.
local core = exports['ai-core']
return {
    ---Medics free to take a call in `jobs`.
    ---@param jobs string[]
    ---@return integer
    available = function(jobs) return core:GetAvailableMedics(jobs) end,
    ---Sends a distress call for a player to the medics of `call.jobs`; false when nothing took it.
    ---@param src integer
    ---@param call { jobs: string[], message?: string }
    ---@return boolean
    distress = function(src, call) return core:SendDistress(src, call) end,
    ---@return string?
    provider = function() return core:GetEmsSystem() end,
}
