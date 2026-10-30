-- ESX on ai-core, client UI: esx_context (ESX.OpenContext), ESX.UI.Menu with esx_menu_default / dialog / list,
-- esx_textui, esx_notify, esx_progressbar, ESX interactions and help notifications, all drawn by ai-core's menu,
-- input dialog, prompts, notifications and progress bar (bridge/core/ui.lua). ai-core provides the esx_* names, so
-- their exports are answered here too. Logic follows es_extended 1.12.4 (GPL-3.0).

local RESOURCE = GetCurrentResourceName()
local clean = BridgeUI.clean

-- esx_context --------------------------------------------------------------------------------------------------------

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

-- ESX.UI.Menu --------------------------------------------------------------------------------------------------------

---@class ESXMenu
---@field type string
---@field namespace string
---@field resourceName string
---@field name string
---@field data table
---@field submit? function
---@field cancel? function
---@field change? function
---@field close fun()
---@field update fun(query: table, newData: table)
---@field refresh fun()
---@field setElement fun(i: integer, key: string, val: any)
---@field setElements fun(newElements: table)
---@field setTitle fun(val: string)
---@field removeElement fun(query: table)

ESX.UI = ESX.UI or {}
ESX.UI.Menu = { RegisteredTypes = {}, Opened = {} }

---@param menuType string
---@param open fun(namespace: string, name: string, data: table)
---@param close fun(namespace: string, name: string)
function ESX.UI.Menu.RegisterType(menuType, open, close)
    ESX.UI.Menu.RegisteredTypes[menuType] = { open = open, close = close }
end

---@param menu ESXMenu
---@param menuType string
---@param namespace string
---@param name string
local function matches(menu, menuType, namespace, name)
    return menu.type == menuType and menu.namespace == namespace and menu.name == name
end

---@param menuType string
---@param namespace string
---@param name string
local function forget(menuType, namespace, name)
    local opened = ESX.UI.Menu.Opened
    for i = #opened, 1, -1 do
        if matches(opened[i], menuType, namespace, name) then table.remove(opened, i) end
    end
end

---@param menuType string
---@param namespace string
---@param name string
---@param data table
---@param submit? function
---@param cancel? function
---@param change? function
---@param close? function
---@return ESXMenu
function ESX.UI.Menu.Open(menuType, namespace, name, data, submit, cancel, change, close)
    local registered = ESX.UI.Menu.RegisteredTypes[menuType]
    if not registered then error(('ESX menu type "%s" is not registered'):format(tostring(menuType)), 2) end
    local menu = {
        type = menuType,
        namespace = namespace,
        resourceName = GetInvokingResource() or RESOURCE,
        name = name,
        data = type(data) == 'table' and data or {},
        submit = submit,
        cancel = cancel,
        change = change,
    } --[[@as ESXMenu]]
    menu.data.elements = menu.data.elements or {}

    function menu.close()
        BridgeUI.call(ESX.UI.Menu.RegisteredTypes[menuType].close, namespace, name)
        forget(menuType, namespace, name)
        BridgeUI.call(close)
    end

    function menu.update(query, newData)
        for _, element in ipairs(menu.data.elements) do
            local match = true
            for k, v in pairs(query) do
                if element[k] ~= v then match = false end
            end
            if match then
                for k, v in pairs(newData) do element[k] = v end
            end
        end
    end

    function menu.refresh() BridgeUI.call(ESX.UI.Menu.RegisteredTypes[menuType].open, namespace, name, menu.data) end
    function menu.setElement(i, key, val) menu.data.elements[i][key] = val end
    function menu.setElements(newElements) menu.data.elements = newElements end
    function menu.setTitle(val) menu.data.title = val end

    function menu.removeElement(query)
        local elements = menu.data.elements
        for i = #elements, 1, -1 do
            for k, v in pairs(query) do
                if elements[i] and elements[i][k] == v then
                    table.remove(elements, i)
                    break
                end
            end
        end
    end

    ESX.UI.Menu.Opened[#ESX.UI.Menu.Opened + 1] = menu
    BridgeUI.call(registered.open, namespace, name, menu.data)
    return menu
end

---@param menu ESXMenu
local function cancelMenu(menu)
    BridgeUI.call(ESX.UI.Menu.RegisteredTypes[menu.type].close, menu.namespace, menu.name)
    BridgeUI.call(menu.cancel, menu.data, menu)
end

---@param menuType string
---@param namespace string
---@param name string
---@param cancel? boolean the close counts as a cancel
function ESX.UI.Menu.Close(menuType, namespace, name, cancel)
    local opened = ESX.UI.Menu.Opened
    for i = #opened, 1, -1 do
        local menu = opened[i]
        if menu and matches(menu, menuType, namespace, name) then
            if cancel then cancelMenu(menu) else menu.close() end
            forget(menuType, namespace, name)
        end
    end
end

---@param cancel? boolean the close counts as a cancel
function ESX.UI.Menu.CloseAll(cancel)
    local opened = ESX.UI.Menu.Opened
    for i = #opened, 1, -1 do
        local menu = opened[i]
        if menu then
            if cancel then cancelMenu(menu) else menu.close() end
        end
    end
    ESX.UI.Menu.Opened = {}
end

---@param menuType string
---@param namespace string
---@param name string
---@return ESXMenu|nil
function ESX.UI.Menu.GetOpened(menuType, namespace, name)
    for _, menu in ipairs(ESX.UI.Menu.Opened) do
        if matches(menu, menuType, namespace, name) then return menu end
    end
end

---@return ESXMenu[]
function ESX.UI.Menu.GetOpenedMenus() return ESX.UI.Menu.Opened end

ESX.UI.Menu.IsOpen = ESX.UI.Menu.GetOpened

-- The esx_menu_default / dialog / list types, drawn by ai-core's menu and input dialog.

---@type table<string, BridgeDialog>
local menuDialogs = {}

---@param menu ESXMenu
---@param extra? table
local function menuData(menu, extra)
    local data = { _namespace = menu.namespace, _name = menu.name }
    for k, v in pairs(extra or {}) do data[k] = v end
    return data
end

--- A close by the player: the menu's cancel, or a close when it has none (ESX would leave the menu stuck open).
---@param menu ESXMenu
local function playerCancel(menu)
    if BridgeUI.isCallable(menu.cancel) then
        BridgeUI.call(menu.cancel, menuData(menu), menu)
    else
        menu.close()
    end
end

---@param e table
local function sliderText(e)
    if type(e.options) == 'table' then return clean(e.options[(tonumber(e.value) or 0) + 1]) end
    return tostring(e.value or 0)
end

--- A slider row asks for its value; the menu's change hears it, a menu without change gets the submit (shops).
---@param menu ESXMenu
---@param e table
local function pickSlider(menu, e)
    ---@type BridgeDialog
    local sub
    local function chosen(value)
        BridgeUI.close(sub)
        if value == nil then return end
        e.value = value
        local data = menuData(menu, { current = e, elements = menu.data.elements })
        if BridgeUI.isCallable(menu.change) then
            BridgeUI.call(menu.change, data, menu)
        else
            BridgeUI.call(menu.submit, data, menu)
        end
    end
    if type(e.options) == 'table' then
        sub = {
            kind = 'menu',
            owner = menu.resourceName,
            build = function()
                local items = {}
                for j, option in ipairs(e.options) do
                    items[j] = { id = tostring(j - 1), label = clean(option), icon = j - 1 == e.value and 'check' or nil }
                end
                return { title = clean(e.label), items = items, back = true }
            end,
            answer = function(value) chosen(value ~= nil and value ~= '__back' and tonumber(value) or nil) end,
        }
    else
        sub = {
            kind = 'input',
            owner = menu.resourceName,
            build = function()
                return {
                    title = clean(e.label),
                    confirm = BridgeUI.text('BRIDGE_CONFIRM'),
                    fields = { { name = 'value', label = '', type = 'number', min = tonumber(e.min) or 0, max = tonumber(e.max), placeholder = tostring(e.value or '') } },
                }
            end,
            answer = function(values)
                local v = type(values) == 'table' and tonumber(values.value)
                chosen(v and math.floor(v) or nil)
            end,
        }
    end
    BridgeUI.open(sub)
end

---@class ESXBridgeMenuType
---@field kind 'menu'|'input'
---@field build fun(data: table): table
---@field answer fun(menu: ESXMenu, value: any)

---@type table<string, ESXBridgeMenuType>
local TYPES = {
    default = {
        kind = 'menu',
        build = function(data)
            local items = {}
            for i, e in ipairs(data.elements or {}) do
                local label = clean(e.label)
                if e.type == 'slider' then label = ('%s: < %s >'):format(label, sliderText(e)) end
                items[i] = {
                    id = tostring(i),
                    label = label,
                    icon = BridgeUI.icon(e.icon),
                    description = e.description and clean(e.description) or nil,
                    disabled = (e.disabled or e.unselectable) and true or false,
                }
            end
            return { title = clean(data.title), items = items, back = #ESX.UI.Menu.Opened > 1 }
        end,
        answer = function(menu, value)
            if value == nil or value == '__back' then return playerCancel(menu) end
            local e = menu.data.elements[tonumber(value) or 0]
            if not e then return end
            if e.type == 'slider' then return pickSlider(menu, e) end
            BridgeUI.call(menu.submit, menuData(menu, { current = e, elements = menu.data.elements }), menu)
        end,
    },
    dialog = {
        kind = 'input',
        build = function(data)
            local big = data.type == 'big'
            return {
                title = clean(data.title),
                confirm = BridgeUI.text('BRIDGE_CONFIRM'),
                fields = { { name = 'value', label = '', type = 'text', multiline = big, maxLength = big and 1000 or 255, value = data.value ~= nil and tostring(data.value) or nil } },
            }
        end,
        answer = function(menu, values)
            if type(values) ~= 'table' then return playerCancel(menu) end
            local data = menuData(menu, { title = menu.data.title, type = menu.data.type, value = values.value })
            -- esx_menu_dialog: numbers are rounded and must be above 0, every value is trimmed to text.
            local number = tonumber(data.value)
            if number then
                data.value = ESX.Math.Round(number)
                if data.value <= 0 then return BridgeClient.notify(BridgeUI.text('BRIDGE_INPUT_NOT_ALLOWED'), 'error') end
            end
            data.value = ESX.Math.Trim(data.value)
            BridgeUI.call(menu.submit, data, menu)
        end,
    },
    list = {
        kind = 'menu',
        build = function(data)
            local items = {}
            for r, row in ipairs(data.rows or {}) do
                local texts, buttons = {}, {}
                for _, col in ipairs(row.cols or {}) do
                    col = tostring(col)
                    for label, value in col:gmatch('{{(.-)|(.-)}}') do buttons[#buttons + 1] = { label, value } end
                    local text = clean(col:gsub('{{.-}}', ''))
                    if text:match('%S') then texts[#texts + 1] = text end
                end
                local line = table.concat(texts, ' | ')
                if #buttons == 0 then items[#items + 1] = { id = 'row:' .. r, label = line, disabled = true } end
                for b, button in ipairs(buttons) do
                    items[#items + 1] = { id = ('%d:%d'):format(r, b), label = ('%s - %s'):format(line, clean(button[1])) }
                end
            end
            local head = {}
            for i, h in ipairs(data.head or {}) do head[i] = clean(h) end
            return { title = clean(data.title or table.concat(head, ' | ')), items = items, back = #ESX.UI.Menu.Opened > 1 }
        end,
        answer = function(menu, value)
            if value == nil or value == '__back' then return playerCancel(menu) end
            local r, b = tostring(value):match('^(%d+):(%d+)$')
            local row = (menu.data.rows or {})[tonumber(r) or 0]
            if not row then return end
            local button = 0
            for _, col in ipairs(row.cols or {}) do
                for _, v in tostring(col):gmatch('{{(.-)|(.-)}}') do
                    button = button + 1
                    if button == tonumber(b) then
                        if type(row.data) == 'table' then row.data.currentRow = tonumber(r) end
                        return BridgeUI.call(menu.submit, menuData(menu, { data = row.data, value = v }), menu)
                    end
                end
            end
        end,
    },
}

for menuType, def in pairs(TYPES) do
    ESX.UI.Menu.RegisterType(menuType, function(namespace, name)
        local key = ('%s\0%s\0%s'):format(menuType, namespace, name)
        local existing = menuDialogs[key]
        if existing and BridgeUI.isOpen(existing) then return BridgeUI.refresh(existing) end
        local menu = ESX.UI.Menu.GetOpened(menuType, namespace, name)
        if not menu then return end
        ---@type BridgeDialog
        local dialog = {
            kind = def.kind,
            owner = menu.resourceName,
            build = function()
                local current = ESX.UI.Menu.GetOpened(menuType, namespace, name)
                return def.build(current and current.data or {})
            end,
            answer = function(value)
                local current = ESX.UI.Menu.GetOpened(menuType, namespace, name)
                if current then def.answer(current, value) end
            end,
        }
        menuDialogs[key] = dialog
        BridgeUI.open(dialog)
    end, function(namespace, name)
        local key = ('%s\0%s\0%s'):format(menuType, namespace, name)
        local dialog = menuDialogs[key]
        menuDialogs[key] = nil
        if dialog then BridgeUI.close(dialog) end
    end)
end

-- Interactions, text UI, help notifications ---------------------------------------------------------------------------

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

-- Help notifications become ai-core's prompt (scripts call them every frame): hidden once the calls stop.
local help = { text = nil, untilTime = 0, watching = false }

---@param msg string
---@param thisFrame? boolean
---@param _beep? boolean
---@param duration? integer
function ESX.ShowHelpNotification(msg, thisFrame, _beep, duration)
    local text = clean(tostring(msg or ''):gsub('~INPUT_[%w_]+~', ''):gsub('%s%s+', ' '))
    help.untilTime = GetGameTimer() + ((thisFrame or not duration or duration < 0) and 250 or duration)
    if help.text ~= text then
        help.text = text
        BridgeUI.showText('esx_help', text, GetInvokingResource() or RESOURCE)
    end
    if help.watching then return end
    help.watching = true
    CreateThread(function()
        while GetGameTimer() < help.untilTime do Wait(100) end
        help.watching, help.text = false, nil
        BridgeUI.hideText('esx_help')
    end)
end

---@param msg string
---@param coords vector3|table
function ESX.ShowFloatingHelpNotification(msg, coords)
    AddTextEntry('esxFloatingHelpNotification', msg)
    SetFloatingHelpTextWorldPosition(1, coords.x, coords.y, coords.z)
    SetFloatingHelpTextStyle(1, 1, 2, -1, 3, 0)
    BeginTextCommandDisplayHelp('esxFloatingHelpNotification')
    EndTextCommandDisplayHelp(2, false, false, -1)
end

---@param sender string
---@param subject string
---@param msg string
---@param _textureDict? string
---@param _iconType? integer
function ESX.ShowAdvancedNotification(sender, subject, msg, _textureDict, _iconType)
    local text = clean(msg)
    if subject and subject ~= '' then text = ('%s: %s'):format(clean(subject), text) end
    exports['ai-core']:Notify({ title = sender and clean(sender) or nil, text = text, kind = 'info' })
end

---@param msg string
---@param time integer
function ESX.DrawMissionText(msg, time)
    ClearPrints()
    BeginTextCommandPrint('STRING')
    AddTextComponentSubstringPlayerName(msg)
    EndTextCommandPrint(time, true)
end

-- Progress bar -------------------------------------------------------------------------------------------------------

---@class ProgressBarOptions
---@field FreezePlayer? boolean
---@field animation? { type: 'anim'|'Scenario', dict?: string, lib?: string, Scenario?: string }
---@field onFinish? function
---@field onCancel? function

---@param message string
---@param length? integer ms
---@param options? ProgressBarOptions
---@return boolean
function ESX.Progressbar(message, length, options)
    options = type(options) == 'table' and options or {}
    local animation = type(options.animation) == 'table' and options.animation or {}
    return BridgeUI.progress({
        label = message or '',
        duration = tonumber(length) or 3000,
        owner = GetInvokingResource() or RESOURCE,
        whileDead = true,
        freeze = options.FreezePlayer == true,
        anim = animation.type == 'anim' and animation.dict and { dict = animation.dict, clip = animation.lib, flag = 1 } or nil,
        scenario = animation.type == 'Scenario' and animation.Scenario or nil,
        onDone = function(cancelled) BridgeUI.call(cancelled and options.onCancel or options.onFinish) end,
    })
end

function ESX.CancelProgressbar() BridgeUI.cancelProgress(true) end

-- The esx_* resources' exports and events (ai-core provides their names) --------------------------------------------

---@param name string
---@param export string
---@param fn function
local function provide(name, export, fn) BridgeClient.provideExport(name, export, fn) end

provide('esx_context', 'Open', function(...) return ESX.OpenContext(...) end)
provide('esx_context', 'Preview', function() return ESX.PreviewContext() end)
provide('esx_context', 'Close', function() return ESX.CloseContext() end)
provide('esx_context', 'Refresh', function(...) return ESX.RefreshContext(...) end)
provide('esx_context', 'focusPreview', function() end)
provide('esx_textui', 'TextUI', function(...) return ESX.TextUI(...) end)
provide('esx_textui', 'HideUI', function() return ESX.HideUI() end)
provide('esx_notify', 'Notify', function(kind, length, message) BridgeClient.notify(message or '', kind, length) end)
provide('esx_progressbar', 'Progressbar', function(...) return ESX.Progressbar(...) end)
provide('esx_progressbar', 'CancelProgressbar', function() return ESX.CancelProgressbar() end)

RegisterNetEvent('ESX:TextUI', function(message, kind) ESX.TextUI(message, kind) end)
RegisterNetEvent('ESX:HideUI', function() ESX.HideUI() end)
RegisterNetEvent('ESX:Notify', function(kind, length, message) BridgeClient.notify(message or '', kind, length) end)
RegisterNetEvent('esx:showAdvancedNotification', function(...) ESX.ShowAdvancedNotification(...) end)
RegisterNetEvent('esx:showHelpNotification', function(msg, thisFrame, beep, duration) ESX.ShowHelpNotification(msg, thisFrame, beep, duration) end)

AddEventHandler('onClientResourceStop', function(resource)
    if context and context.owner == resource then context = nil end
    for name, interaction in pairs(interactions) do
        if interaction.creator == resource then interactions[name] = nil end
    end
    local opened = ESX.UI.Menu.Opened
    for i = #opened, 1, -1 do
        if opened[i].resourceName == resource then table.remove(opened, i) end
    end
end)
