-- Key hints a script shows for a while (a tool's controls) next to the ones keybinds declare with `hint`; HUDs list
-- them on the left. `keybind` shows that keybind's current key, `key` a literal text.
return {
    ---@param id string
    ---@param hint { label: string, keybind?: string, key?: string, icon?: string }
    show = function(id, hint) exports['ai-core']:ShowKeyHint(id, hint) end,
    ---@param id string
    hide = function(id) exports['ai-core']:HideKeyHint(id) end,
}
