-- ESX on ai-core, client UI: esx_context (ESX.OpenContext and its functions) on ai-core's menu and input dialog
-- (bridge/core/client/dialogs.lua). Logic follows es_extended 1.12.4 (GPL-3.0).

local RESOURCE = GetCurrentResourceName()
local clean = BridgeUI.clean

---@class ESXContextElement
---@field title? string
---@field description? string
---@field icon? string
---@field disabled? boolean
---@field unselectable? boolean|string
---@field input? boolean
---@field inputType? 'text'|'number'|'radio'
---@field inputPlaceholder? string
---@field inputValue? any
---@field inputMin? number
---@field inputMax? number
---@field inputValues? { value: any, title: string }[]
---@field name? string

---@class ESXContext
---@field position string
---@field eles ESXContextElement[]
---@field canClose boolean
---@field onSelect? function
---@field onClose? function
---@field owner string
---@field dialog BridgeDialog

---@type ESXContext|nil
local context = nil

--- The menu argument esx_context hands to onSelect / onClose.
---@param ctx ESXContext
local function contextArg(ctx)
    return { position = ctx.position, eles = ctx.eles, canClose = ctx.canClose }
end

---@param e ESXContextElement
---@return string
local function inputText(e)
    if e.inputType == 'radio' then
        for _, v in ipairs(e.inputValues or {}) do
            if v.value == (e.inputValue or e.inputPlaceholder) then return clean(v.title) end
        end
        return ''
    end
    return clean(e.inputValue or e.inputPlaceholder or '')
end

---@param ctx ESXContext
local function contextMenu(ctx)
    local items, title, first = {}, '', 1
    local head = ctx.eles[1]
    if head and head.unselectable and not head.input then title, first = clean(head.title), 2 end
    for i = first, #ctx.eles do
        local e = ctx.eles[i]
        local label = clean(e.title)
        if e.input then label = ('%s: %s'):format(label, inputText(e)) end
        items[#items + 1] = {
            id = tostring(i),
            label = label,
            description = e.description and clean(e.description) or nil,
            icon = BridgeUI.icon(e.icon),
            disabled = (e.disabled or e.unselectable) and true or false,
        }
    end
    return { title = title, items = items }
end

--- An input element is edited in its own dialog over the context (ai-core's menu has no fields in rows).
---@param ctx ESXContext
---@param e ESXContextElement
local function editInput(ctx, e)
    ---@type BridgeDialog
    local sub
    if e.inputType == 'radio' then
        sub = {
            kind = 'menu',
            owner = ctx.owner,
            build = function()
                local items = {}
                for j, v in ipairs(e.inputValues or {}) do
                    items[j] = { id = tostring(j), label = clean(v.title), icon = v.value == e.inputValue and 'check' or nil }
                end
                return { title = clean(e.title), items = items, back = true }
            end,
            answer = function(value)
                local picked = (e.inputValues or {})[tonumber(value) or 0]
                if picked then e.inputValue = picked.value end
                BridgeUI.close(sub)
            end,
        }
    else
        local number = e.inputType == 'number'
        sub = {
            kind = 'input',
            owner = ctx.owner,
            build = function()
                return {
                    title = clean(e.title),
                    confirm = BridgeUI.text('BRIDGE_CONFIRM'),
                    fields = { {
                        name = 'value',
                        label = '',
                        type = number and 'number' or 'text',
                        min = number and tonumber(e.inputMin) or nil,
                        max = number and tonumber(e.inputMax) or nil,
                        placeholder = e.inputPlaceholder ~= nil and tostring(e.inputPlaceholder) or nil,
                        value = not number and e.inputValue ~= nil and tostring(e.inputValue) or nil,
                    } },
                }
            end,
            answer = function(values)
                local v = type(values) == 'table' and values.value
                if number and tonumber(v) then
                    v = tonumber(v)
                    if e.inputMin then v = math.max(e.inputMin, v) end
                    if e.inputMax then v = math.min(e.inputMax, v) end
                    e.inputValue = v
                elseif not number and type(v) == 'string' then
                    e.inputValue = v
                end
                BridgeUI.close(sub)
            end,
        }
    end
    BridgeUI.open(sub)
end

---@param position string
---@param eles ESXContextElement[]
---@param onSelect? function
---@param onClose? function
---@param canClose? boolean
function ESX.OpenContext(position, eles, onSelect, onClose, canClose)
    ---@type ESXContext
    local ctx = {
        position = position,
        eles = type(eles) == 'table' and eles or {},
        canClose = canClose == nil and true or canClose == true,
        onSelect = onSelect,
        onClose = onClose,
        owner = GetInvokingResource() or RESOURCE,
        dialog = nil --[[@as BridgeDialog]],
    }
    ctx.dialog = {
        kind = 'menu',
        owner = ctx.owner,
        build = function() return contextMenu(ctx) end,
        answer = function(value)
            if value == nil then
                if ctx.canClose and context == ctx then ESX.CloseContext() end
                return
            end
            local e = ctx.eles[tonumber(value) or 0]
            if not e then return end
            if e.input then return editInput(ctx, e) end
            BridgeUI.call(ctx.onSelect, contextArg(ctx), e)
        end,
    }
    -- A new context replaces the open one without its onClose (esx_context behaviour).
    local last = context
    context = ctx
    BridgeUI.open(ctx.dialog, last and last.dialog)
end

--- esx_context's Preview shows the menu without focus; ai-core has no unfocused menu, so nothing is shown.
function ESX.PreviewContext() end

function ESX.CloseContext()
    local ctx = context
    if not ctx then return end
    context = nil
    BridgeUI.close(ctx.dialog)
    BridgeUI.call(ctx.onClose, contextArg(ctx))
end

---@param eles? ESXContextElement[]
---@param position? string
function ESX.RefreshContext(eles, position)
    if not context then return end
    context.eles = type(eles) == 'table' and eles or context.eles
    context.position = position or context.position
    BridgeUI.refresh(context.dialog)
end

AddEventHandler('onClientResourceStop', function(resource)
    if context and context.owner == resource then context = nil end
end)
