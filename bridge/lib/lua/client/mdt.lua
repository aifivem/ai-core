-- The police MDT through ai-core's client MDT layer, like the TypeScript lib's `mdt`.
local core = exports['ai-core']
return {
    ---Opens the active MDT (it checks the job itself); false when none runs or it cannot be opened from outside.
    ---@return boolean
    open = function() return core:OpenMdt() end,
}
