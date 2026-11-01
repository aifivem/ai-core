-- ESX on ai-core, client side: ESX.HashString and ESX.RegisterInput (an ai-lib Keybind).

---@param str string
---@return string
function ESX.HashString(str)
    return ('~INPUT_%s~'):format(('%x'):format(joaat(str) & 0x7fffffff + 2 ^ 31):upper())
end

--- A key mapping for the calling script: an ai-lib Keybind, so it shows in the panel's keybinds and the keys screen
--- (registered in ai-core, so it goes when ai-core stops).
---@param command_name string
---@param label string
---@param input_group string
---@param key string
---@param on_press function
---@param on_release? function
function ESX.RegisterInput(command_name, label, input_group, key, on_press, on_release)
    aiLib.Keybind.new({
        name = command_name,
        description = label or command_name,
        defaultKey = key ~= '' and key or nil,
        defaultMapper = input_group ~= '' and input_group or nil,
        onPressed = function() BridgeUI.call(on_press) end,
        onReleased = on_release and function() BridgeUI.call(on_release) end or nil,
    })
end
