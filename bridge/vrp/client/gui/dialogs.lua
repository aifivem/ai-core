-- vRP's prompt, request, notifications and text boxes on the client, and their cleanup when the character goes.

local RESOURCE = GetCurrentResourceName()
local tvRP = BridgeVRPClient.tvRP
local server = BridgeVRPClient.server
local textOf = BridgeVRPClient.textOf

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
