-- Jail sentences through ai-core, whatever prison script runs (ai-prison, qb-prison), like the TypeScript lib's `prison`.
local core = exports['ai-core']
return {
    ---Sends a loaded player to prison for `minutes`; false while no prison runs.
    ---@param src integer
    ---@param minutes integer
    ---@param by? integer who sent them (for the log)
    ---@return boolean
    jail = function(src, minutes, by) return core:JailPlayer(src, minutes, by or 0) end,
    ---@param src integer
    ---@return boolean
    release = function(src) return core:ReleasePlayer(src) end,
    ---Minutes of sentence left, 0 when free.
    ---@param src integer
    ---@return integer
    timeLeft = function(src) return core:GetJailTime(src) end,
}
