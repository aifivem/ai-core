-- vRP on ai-core, GUI client side: shows the menus, prompts and requests the server keeps (bridge/vrp/ui.lua) with
-- ai-lib's menu and input dialog through bridge/core/ui.lua, plus vRP's notifications and text boxes (`setDiv`).
-- Answers go back on the rate-gated server "vRP" tunnel. No vRP NUI: progress bars, `setDivCss`, `divExecuteJS`,
-- audio and voice are not answered. API: bridge/vrp/CLAUDE.md (GUI).

local RESOURCE = GetCurrentResourceName()
local tvRP = BridgeVRPClient.tvRP
local server = BridgeVRPClient.server
local clean = BridgeUI.clean

-- ai-lib's menu shows 40 rows: longer menus get pages of 38 plus previous / next.
local MAX_ROWS = 40
local PAGE_ROWS = 38
local BACK = '__back'

---@param text any
---@return string
local function textOf(text)
    return clean(text == nil and '' or tostring(text))
end

-- Menus ------------------------------------------------------------------------------------------------------------------

---@class VrpClientMenu
---@field data { id: integer, name: string, choices: table[], back: boolean, main: boolean|nil }
---@field page integer
---@field dialog BridgeDialog

---@type VrpClientMenu|nil
local current = nil

---@param state VrpClientMenu
---@return table MenuRequest
local function buildMenu(state)
    local choices = state.data.choices
    local paged = #choices > MAX_ROWS
    local size = paged and PAGE_ROWS or MAX_ROWS
    local pages = math.max(1, math.ceil(#choices / size))
    state.page = math.min(math.max(1, state.page), pages)
    local first = (state.page - 1) * size + 1
    local items = {}
    for i = first, math.min(#choices, first + size - 1) do
        local choice = choices[i]
        local desc = choice[2] ~= nil and textOf(choice[2]) or ''
        items[#items + 1] = { id = tostring(i), label = textOf(choice[1]), description = desc ~= '' and desc or nil }
    end
    if paged then
        if state.page > 1 then items[#items + 1] = { id = 'prev', label = BridgeUI.text('VRP_PAGE_PREV') } end
        if state.page < pages then items[#items + 1] = { id = 'next', label = BridgeUI.text('VRP_PAGE_NEXT') } end
    end
    local title = state.data.main and BridgeUI.text('VRP_MAIN_MENU') or textOf(state.data.name)
    if paged then title = ('%s (%d/%d)'):format(title, state.page, pages) end
    return { title = title, items = items, back = state.data.back == true }
end

---@param state VrpClientMenu
---@param value any
local function answerMenu(state, value)
    if current ~= state then return end
    if value == 'next' or value == 'prev' then
        -- The dialog stays on the stack and is shown again with the other page.
        state.page = state.page + (value == 'next' and 1 or -1)
        return
    end
    local id = state.data.id
    if value == nil or value == BACK then
        current = nil
        BridgeUI.close(state.dialog)
        server._closeMenu(id, value == nil)
        return
    end
    local number = tonumber(value)
    local index = number and math.tointeger(number)
    if not index then return end
    -- Hidden while the server runs the choice; shown again unless the choice opened, changed or closed a menu.
    BridgeUI.close(state.dialog)
    CreateThread(function()
        server.validMenuChoice(id, index)
        if current == state and not BridgeUI.isOpen(state.dialog) then BridgeUI.open(state.dialog) end
    end)
end

--- vRP's menu from the server (`id`, `name`, `choices` = { { label, description } }): replaces the open one.
---@param data table
function tvRP.openMenuData(data)
    if type(data) ~= 'table' or math.type(data.id) ~= 'integer' or type(data.choices) ~= 'table' then return end
    local old = current
    ---@type VrpClientMenu
    local state = { data = data, page = 1 } ---@diagnostic disable-line: missing-fields
    -- The same menu built again (vRP 2 `actualizeMenu`) keeps its page.
    if old and old.data.name == data.name then state.page = old.page end
    state.dialog = {
        kind = 'menu',
        owner = RESOURCE,
        build = function() return buildMenu(state) end,
        answer = function(value) answerMenu(state, value) end,
    }
    current = state
    BridgeUI.open(state.dialog, old and old.dialog or nil)
end

--- Closes the open menu: `silent` from the server (it already closed it), else a script's `vRPclient.closeMenu`
--- (the server closes it and runs its callbacks).
---@param silent? boolean
function tvRP.closeMenu(silent)
    local state = current
    if not state then return end
    current = nil
    BridgeUI.close(state.dialog)
    if silent ~= true then server._closeMenu(state.data.id, false) end
end

--- One option of the open vRP 2 menu changed (`Menu:updateOption`).
---@param id integer
---@param index integer
---@param title string
---@param description string|nil
function tvRP.updateMenuOption(id, index, title, description)
    local state = current
    if not state or state.data.id ~= id or math.type(index) ~= 'integer' or not state.data.choices[index] then return end
    state.data.choices[index] = { title, description }
    if BridgeUI.isOpen(state.dialog) then BridgeUI.refresh(state.dialog) end
end

---@return { opened: boolean }
function tvRP.getMenuState()
    return { opened = current ~= nil }
end

-- Prompt and request ------------------------------------------------------------------------------------------------------

---@type BridgeDialog|nil
local promptDialog = nil
local TITLE_MAX = 60

--- vRP's text prompt (multi-line, as vRP's); the text goes back to the server, `''` when closed.
---@param title any
---@param default any
---@param id? integer
function tvRP.prompt(title, default, id)
    local heading = textOf(title)
    local long = #heading > TITLE_MAX
    local old = promptDialog
    ---@type BridgeDialog
    local dialog
    dialog = {
        kind = 'input',
        owner = RESOURCE,
        build = function()
            return {
                title = long and BridgeUI.text('VRP_PROMPT') or (heading ~= '' and heading or BridgeUI.text('VRP_PROMPT')),
                confirm = BridgeUI.text('BRIDGE_CONFIRM'),
                fields = { {
                    name = 'value',
                    label = long and heading or '',
                    type = 'text',
                    multiline = true,
                    maxLength = 1000,
                    value = default ~= nil and tostring(default) or '',
                } },
            }
        end,
        answer = function(values)
            if promptDialog == dialog then promptDialog = nil end
            BridgeUI.close(dialog)
            local text = type(values) == 'table' and values.value
            server._promptResult(type(text) == 'string' and text or '', id)
        end,
    }
    promptDialog = dialog
    BridgeUI.open(dialog, old)
end

---@type table<integer, BridgeDialog>
local requests = {}

--- vRP's yes / no request, closed after `time` seconds (no answer = no, as vRP).
---@param id integer
---@param text any
---@param time any seconds
function tvRP.request(id, text, time)
    if math.type(id) ~= 'integer' or requests[id] then return end
    local question = textOf(text)
    local long = #question > TITLE_MAX
    local seconds = math.max(1, math.floor(tonumber(time) or 15))
    ---@type BridgeDialog
    local dialog
    local function finish(ok)
        if requests[id] ~= dialog then return end
        requests[id] = nil
        BridgeUI.close(dialog)
        if ok ~= nil then server._requestResult(id, ok) end
    end
    dialog = {
        kind = 'menu',
        owner = RESOURCE,
        build = function()
            local desc = long and question or nil
            return {
                title = long and BridgeUI.text('VRP_REQUEST') or question,
                items = {
                    { id = 'yes', label = BridgeUI.text('VRP_YES'), icon = 'check', description = desc },
                    { id = 'no', label = BridgeUI.text('VRP_NO'), icon = 'xmark', description = desc },
                },
            }
        end,
        answer = function(value) finish(value == 'yes') end,
    }
    requests[id] = dialog
    BridgeUI.open(dialog)
    PlaySoundFrontend(-1, '5_SEC_WARNING', 'HUD_MINI_GAME_SOUNDSET', true)
    -- One second early, so the server's timeout never answers before the player's choice arrives (as vRP).
    SetTimeout(math.max(1, seconds - 1) * 1000, function() finish(nil) end)
end

-- Notifications and text boxes ------------------------------------------------------------------------------------------

---@param msg any
function tvRP.notify(msg)
    local text = textOf(msg)
    if text ~= '' then aiLib.notify(text, 'info') end
end

--- vRP's picture notification: ai-lib's card with the text (no contact picture).
---@param icon any
---@param kind any
---@param sender any
---@param title any
---@param text any
function tvRP.notifyPicture(icon, kind, sender, title, text) ---@diagnostic disable-line: unused-local
    tvRP.notify(text)
end

--- vRP's announce banner: a notification card with its text.
---@param background any
---@param content any
function tvRP.announce(background, content) ---@diagnostic disable-line: unused-local
    tvRP.notify(content)
end

---@type table<string, boolean> divs set by name
local divs = {}

---@param name any
---@param content any
local function showDiv(name, content)
    local text = textOf(content)
    if text == '' then return BridgeUI.hideText('vrp:div:' .. name) end
    BridgeUI.showText('vrp:div:' .. name, text, RESOURCE)
end

--- vRP's HTML box: its text in ai-lib's text box (HTML and css dropped).
---@param name any
---@param css any
---@param content any
function tvRP.setDiv(name, css, content) ---@diagnostic disable-line: unused-local
    if type(name) ~= 'string' then return end
    divs[name] = true
    showDiv(name, content)
end

---@param name any
---@param content any
function tvRP.setDivContent(name, content)
    if type(name) ~= 'string' or not divs[name] then return end
    showDiv(name, content)
end

---@param name any
function tvRP.removeDiv(name)
    if type(name) ~= 'string' or not divs[name] then return end
    divs[name] = nil
    BridgeUI.hideText('vrp:div:' .. name)
end

-- Main menu key and cleanup --------------------------------------------------------------------------------------------------

---@type AiLibKeybind|nil
local mainKey = nil

-- The server says once that some script registered a `main` menu builder.
RegisterNetEvent('ai-core:vrp:mainMenu', function()
    if mainKey then return end
    mainKey = aiLib.Keybind.new({
        name = 'vrp_main_menu',
        description = BridgeUI.text('VRP_KEY_MAIN_MENU'),
        defaultKey = 'F7',
        onPressed = function()
            if not current and not IsNuiFocused() then server._openMainMenu() end
        end,
    })
end)

-- A character let go: its menu, prompt, requests and text boxes go (the server answered them already).
AddEventHandler('ai-core:client:playerUnloaded', function()
    tvRP.closeMenu(true)
    if promptDialog then
        BridgeUI.close(promptDialog)
        promptDialog = nil
    end
    for id, dialog in pairs(requests) do
        requests[id] = nil
        BridgeUI.close(dialog)
    end
    for name in pairs(divs) do tvRP.removeDiv(name) end
end)
