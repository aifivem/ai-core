-- qb-input on ai-lib's input dialog and menu (through bridge/core/client/dialogs.lua).

local RESOURCE = GetCurrentResourceName()
local clean = BridgeUI.clean

---@class QBInputField
---@field text? string
---@field name string
---@field type? 'text'|'password'|'number'|'radio'|'select'|'checkbox'|'color'
---@field isRequired? boolean
---@field default? any
---@field options? { value: any, text: string }[]

---@param dialog BridgeDialog
---@return any
local function ask(dialog)
    local p = promise.new()
    local answer = dialog.answer
    dialog.answer = function(value)
        BridgeUI.close(dialog)
        answer(value)
        p:resolve(value)
    end
    BridgeUI.open(dialog)
    return Citizen.Await(p)
end

--- qb-input's ShowInput: text and number fields in one dialog, then one pick list per select / radio field; waits
--- and returns the values by field name, or nil when the player closed it. Checkbox fields are not asked.
---@param data { header?: string, submitText?: string, inputs: QBInputField[] }
---@return table<string, any>|nil
local function showInput(data)
    if type(data) ~= 'table' or type(data.inputs) ~= 'table' then return end
    local owner = GetInvokingResource() or RESOURCE
    local title = clean(data.header)
    local fields, choices = {}, {}
    for _, input in ipairs(data.inputs) do
        if type(input) == 'table' and input.name then
            local kind = input.type or 'text'
            if kind == 'select' or kind == 'radio' then
                choices[#choices + 1] = input
            elseif kind ~= 'checkbox' then
                fields[#fields + 1] = {
                    name = tostring(input.name),
                    label = clean(input.text),
                    type = kind == 'number' and 'number' or 'text',
                    placeholder = input.text and clean(input.text) or nil,
                    value = kind ~= 'number' and input.default ~= nil and tostring(input.default) or nil,
                }
            end
        end
    end
    local result = {}
    if #fields > 0 then
        local values = ask({
            kind = 'input',
            owner = owner,
            build = function()
                return { title = title, confirm = data.submitText and clean(data.submitText) or BridgeUI.text('BRIDGE_CONFIRM'), fields = fields }
            end,
            answer = function() end,
        })
        if type(values) ~= 'table' then return nil end
        for k, v in pairs(values) do result[k] = tostring(v) end
    end
    for _, input in ipairs(choices) do
        local options = type(input.options) == 'table' and input.options or {}
        local picked = ask({
            kind = 'menu',
            owner = owner,
            build = function()
                local items = {}
                for j, option in ipairs(options) do
                    items[j] = { id = tostring(j), label = clean(option.text), icon = option.value == input.default and 'check' or nil }
                end
                return { title = clean(input.text or data.header), items = items }
            end,
            answer = function() end,
        })
        local option = options[tonumber(picked) or 0]
        if not option then return nil end
        result[input.name] = option.value
    end
    return result
end

BridgeClient.provideExport('qb-input', 'ShowInput', showInput)
