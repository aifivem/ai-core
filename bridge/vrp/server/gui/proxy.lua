-- The GUI's vRP 1 proxy functions and the server tunnel the client answers on (rate gated by BridgeVRP's tunnel).

local vRP = BridgeVRP.proxy
local ui, gui = BridgeVRP.ui, BridgeVRP.gui
local call, topOf, reopen, remove, stacks, shown = gui.call, gui.topOf, gui.reopen, gui.remove, gui.stacks, gui.shown
local prompts, requests, PROMPT_MAX, hasMain = gui.prompts, gui.requests, gui.promptMax, gui.hasMain

---@param source any
---@param title any
---@param default_text any
---@return string
function vRP.prompt(source, title, default_text) return ui.prompt(source, title, default_text) --[[@as string]] end

---@param source any
---@param text any
---@param time any seconds
---@return boolean
function vRP.request(source, text, time) return ui.request(source, text, time) == true end

---@param source any
---@param menudef table
function vRP.openMenu(source, menudef) ui.openMenu(source, menudef, GetInvokingResource()) end

---@param source any
function vRP.closeMenu(source) ui.closeMenu(source) end

---@param name string
---@param builder function
function vRP.registerMenuBuilder(name, builder) ui.registerMenuBuilder(name, builder, GetInvokingResource()) end

---@param name string
---@param data any
---@return table
function vRP.buildMenu(name, data) return ui.buildMenu(name, data) end

---@param source any
function vRP.openMainMenu(source) ui.openMainMenu(source) end

-- Server tunnel (the client's answers; rate gated by BridgeVRP's tunnel) ----------------------------------------------

--- A pick in the open menu: `index` of the choices as sent; runs the choice for the player it was opened for.
---@param id any
---@param index any
function BridgeVRP.tunnel.validMenuChoice(id, index)
    local src = tonumber(source) --[[@as integer]]
    local top = topOf(src)
    if not top or top.id ~= id or math.type(index) ~= 'integer' then return end
    if top.def then
        local key = top.keys[index]
        local choice = key ~= nil and top.def[key]
        if type(choice) == 'table' then call(choice[1], src, key, 0) end
    else
        top.menu:triggerOption(index, 0)
    end
end

--- The player closed the open menu (`all`: the whole stack, Escape held).
---@param id any
---@param all any
function BridgeVRP.tunnel.closeMenu(id, all)
    local src = tonumber(source) --[[@as integer]]
    local stack = stacks[src]
    local top = stack and stack[#stack]
    if not top or top.id ~= id then return end
    shown[src] = nil
    -- Only the menus open now: an `onclose` that opens another menu keeps it.
    local closing = all == true and { table.unpack(stack) } or { top }
    for i = #closing, 1, -1 do
        for j = #stack, 1, -1 do
            if stack[j] == closing[i] then
                remove(src, j)
                break
            end
        end
    end
    reopen(src)
end

---@param text any
---@param id any
function BridgeVRP.tunnel.promptResult(text, id)
    local src = tonumber(source) --[[@as integer]]
    local prompt = prompts[src]
    if not prompt or (id ~= nil and id ~= prompt.id) then return end
    prompts[src] = nil
    prompt.answer(type(text) == 'string' and text:sub(1, PROMPT_MAX) or '')
end

---@param id any
---@param ok any
function BridgeVRP.tunnel.requestResult(id, ok)
    local request = requests[id]
    if not request or request.source ~= tonumber(source) then return end
    requests[id] = nil
    request.answer(ok == true)
end

function BridgeVRP.tunnel.openMainMenu()
    local src = tonumber(source) --[[@as integer]]
    if hasMain() and not topOf(src) then ui.openMainMenu(src) end
end
