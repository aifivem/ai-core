---HUDs through ai-core: a full-screen UI hides them on open and shows them on close (reasons are counted per resource).
return {
    ---@param reason string
    hide = function(reason) exports['ai-core']:HideHud(reason) end,
    ---@param reason string
    show = function(reason) exports['ai-core']:ShowHud(reason) end,
    ---@return boolean
    visible = function() return exports['ai-core']:IsHudVisible() end,
}
