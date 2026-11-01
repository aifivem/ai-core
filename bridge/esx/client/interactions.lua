-- ESX on ai-core, client UI: ESX interactions and esx_textui on ai-core's prompts and interaction key.

local RESOURCE = GetCurrentResourceName()

---@type table<string, { onPress: function, condition?: function, creator: string }>
local interactions = {}

--- An action for ESX's interaction key: ai-core's interaction key runs every interaction whose condition holds while
--- an ESX text UI or help notification prompt is on screen.
---@param name string
---@param onPress function
---@param condition? function
function ESX.RegisterInteraction(name, onPress, condition)
    interactions[name] = { onPress = onPress, condition = condition, creator = GetInvokingResource() or RESOURCE }
end

---@param name string
function ESX.RemoveInteraction(name) interactions[name] = nil end

--- The key bound to ai-core's interaction keybind (ESX's interaction key).
---@return string
function ESX.GetInteractKey()
    local key = exports['ai-core']:GetKeybindKey('aicore_interact') or 'E'
    local button = GetControlInstructionalButton(0, joaat(('+aicore_interact_%s'):format(key)) | 0x80000000, true)
    return button:sub(1, 2) == 't_' and button:sub(3) or key
end

local function runInteractions()
    for _, interaction in pairs(interactions) do
        if interaction.condition == nil or BridgeUI.call(interaction.condition) then BridgeUI.call(interaction.onPress) end
    end
end
BridgeUI.onPrompt('esx_textui', runInteractions)
BridgeUI.onPrompt('esx_help', runInteractions)

---@param message? string
---@param _type? string
function ESX.TextUI(message, _type)
    BridgeUI.showText('esx_textui', message or '', GetInvokingResource() or RESOURCE)
end

function ESX.HideUI() BridgeUI.hideText('esx_textui') end

AddEventHandler('onClientResourceStop', function(resource)
    for name, interaction in pairs(interactions) do
        if interaction.creator == resource then interactions[name] = nil end
    end
end)
