-- ai-core's framework bridge, client UI: the frameworks' text prompts on ai-lib's prompts and interaction key.

local RESOURCE = GetCurrentResourceName()
local ui = exports['ai-lib']

---@type table<string, string>
local promptOwners = {}
---@type table<string, fun()>
local promptHandlers = {}

--- Shows (or changes) the bridge's prompt `id` on the right of the screen for `owner`.
---@param id string
---@param text any
---@param owner string
function BridgeUI.showText(id, text, owner)
    promptOwners[id] = owner
    ui:ShowPrompt('bridge:' .. id, BridgeUI.clean(text))
end

---@param id string
function BridgeUI.hideText(id)
    if not promptOwners[id] then return end
    promptOwners[id] = nil
    ui:HidePrompt('bridge:' .. id)
end

--- Runs `fn` when the player presses ai-lib's interaction key while the bridge's prompt `id` is on top.
---@param id string
---@param fn fun()
function BridgeUI.onPrompt(id, fn)
    promptHandlers[id] = fn
end

AddEventHandler('ai-lib:client:promptPressed', function(owner, id)
    if owner ~= RESOURCE or type(id) ~= 'string' then return end
    local handler = promptHandlers[id:match('^bridge:(.+)$') or '']
    if handler then handler() end
end)

-- A stopped resource takes its prompts with it.
AddEventHandler('onClientResourceStop', function(resource)
    if resource == RESOURCE then return end
    for id, owner in pairs(promptOwners) do
        if owner == resource then BridgeUI.hideText(id) end
    end
end)
