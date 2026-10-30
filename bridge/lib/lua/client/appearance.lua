---Looks on peds through ai-core's appearance layer, whatever clothing script runs (ai-appearance, tgiann-clothing).
local core = exports['ai-core']
return {
    ---Puts a look (server `aiLib.appearance.get`) on a ped of the look's model; false when the ped is gone, the
    ---model differs or no clothing script runs. On the player's own ped it changes their clothes.
    ---@param ped integer
    ---@param look AiLibCharacterAppearance
    ---@return boolean
    apply = function(ped, look) return core:ApplyAppearance(ped, look) end,
    ---The look a ped wears now, nil when the clothing script cannot tell.
    ---@param ped integer
    ---@return AiLibCharacterAppearance?
    read = function(ped) return core:GetPedAppearance(ped) end,
}
