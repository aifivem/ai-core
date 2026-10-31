-- vRP on ai-core, GUI server side: vRP 1 menus (`openMenu`, `closeMenu`, builders, main menu), vRP 2 / 3 menus
-- (`BridgeVRP.ui.v2`, for the GUI extension), `prompt` and `request`. The server keeps every menu, prompt and request
-- per player; bridge/vrp/ui_client.lua shows them with ai-lib's menu and input dialog and answers on the rate-gated
-- "vRP" tunnel, each answer checked against the player it was opened for. API: bridge/vrp/CLAUDE.md (GUI).
-- Logic follows vRP 1.0 `modules/gui.lua` and vRP 2 `vrp/modules/gui.lua` (https://github.com/vRP-framework/vRP, MIT).

local RESOURCE = GetCurrentResourceName()
local vRP = BridgeVRP.proxy

---@param value any
---@return boolean
local function isCallable(value)
    if type(value) == 'function' then return true end
    local meta = type(value) == 'table' and getmetatable(value)
    return meta and type(meta.__call) == 'function' or false
end

--- Runs a script's callback (a Lua function or another resource's function reference); an error is printed and
--- leaves the menu state intact.
---@param fn any
---@return any
local function call(fn, ...)
    if not isCallable(fn) then return end
    local ok, result = pcall(fn, ...)
    if not ok then print(('^1[vRP] GUI callback failed: %s^0'):format(result)) end
    return ok and result or nil
end

---@param source any
---@return integer|nil
local function online(source)
    source = tonumber(source)
    if not source or source <= 0 or not GetPlayerName(tostring(source)) then return nil end
    return source
end

--- Starts something that answers once through `answer`: with `cb` the answer goes there and nothing waits, without
--- it the answer is returned (waits in a thread, as vRP).
---@param start fun(answer: fun(value: any))
---@param cb any
---@return any
local function settle(start, cb)
    local done, result, p = false, nil, nil
    local function answer(value)
        if done then return end
        done, result = true, value
        if cb ~= nil then return call(cb, value) end
        if p then p:resolve(value) end
    end
    start(answer)
    if cb ~= nil or done then return result end
    p = promise.new()
    return Citizen.Await(p)
end

---@class VrpMenuEntry
---@field id integer
---@field owner string|nil the resource that opened it (a stopped owner's menu goes without its callbacks)
---@field def table|nil vRP 1 menudef
---@field keys any[]|nil vRP 1 choice keys in the order shown
---@field main boolean|nil vRP 1 main menu (the client shows its own title)
---@field menu VrpMenu|nil vRP 2 menu

---@class BridgeVRPUiV2
---@field builders table<string, function[]> vRP 2 `GUI.menu_builders`: name -> builders
---@field user (fun(source: integer): table|nil)|nil the vRP 2 user of a player (set by the GUI extension; the main key opens its `main` menu)
local v2 = { builders = {} }

---@class BridgeVRPUi
local ui = { v2 = v2 }
BridgeVRP.ui = ui

---@type table<integer, VrpMenuEntry[]> source -> menus, top last
local stacks = {}
---@type table<integer, integer> source -> id of the menu the client was sent last
local shown = {}
local lastId = 0

---@return integer
local function newId()
    lastId = lastId + 1
    return lastId
end

---@param source integer
---@return VrpMenuEntry[]
local function stackOf(source)
    local stack = stacks[source]
    if not stack then
        stack = {}
        stacks[source] = stack
    end
    return stack
end

---@param source integer
---@return VrpMenuEntry|nil
local function topOf(source)
    local stack = stacks[source]
    return stack and stack[#stack] or nil
end

---@param entry VrpMenuEntry
---@param back boolean
---@return table menudata as vRP 1 sends it (`id`, `name`, `choices` = { { label, description } }) plus `back`, `main`
local function serialize(entry, back)
    local choices = {}
    if entry.def then
        for i, key in ipairs(entry.keys or {}) do
            local choice = entry.def[key]
            local desc = type(choice) == 'table' and choice[2] or nil
            choices[i] = { tostring(key), type(desc) == 'string' and desc or nil }
        end
        return { id = entry.id, name = tostring(entry.def.name or 'Menu'), choices = choices, back = back, main = entry.main }
    end
    local menu = entry.menu --[[@as VrpMenu]]
    for i, option in ipairs(menu.options) do
        local desc = option[3]
        if isCallable(desc) then desc = call(desc, menu, option[4]) end
        choices[i] = { tostring(option[1] or ''), type(desc) == 'string' and desc or nil }
    end
    return { id = entry.id, name = tostring(menu.title or menu.name or ''), choices = choices, back = back }
end

--- Sends the player's top menu, or hides the menu when there is none (only what changed since the last send).
---@param source integer
local function show(source)
    local stack = stacks[source]
    local top = stack and stack[#stack]
    if not top then
        stacks[source] = nil
        if shown[source] then
            shown[source] = nil
            BridgeVRP.client._closeMenu(source, true)
        end
        return
    end
    if shown[source] == top.id then return end
    shown[source] = top.id
    BridgeVRP.client._openMenuData(source, serialize(top, #stack > 1))
end

---@param menu VrpMenu
local function buildV2(menu)
    for _, builder in ipairs(v2.builders[menu.name] or {}) do call(builder, menu) end
end

--- Shows the player's top menu again; a vRP 2 menu is built again first (vRP 2's `actualizeMenu`).
---@param source integer
local function reopen(source)
    local top = topOf(source)
    if top and top.menu then
        local menu = top.menu
        menu:triggerClose()
        menu:initialize()
        buildV2(menu)
        if topOf(source) ~= top then return show(source) end
        top.id = newId()
    end
    show(source)
end

--- Takes menu `index` off the player's stack and runs its close callbacks (vRP 1 `onclose`, vRP 2 `close` + `remove`).
---@param source integer
---@param index integer
local function remove(source, index)
    local stack = stacks[source]
    local entry = stack and stack[index]
    if not entry then return end
    table.remove(stack, index)
    if entry.def then
        call(entry.def.onclose, source)
    else
        local menu = entry.menu --[[@as VrpMenu]]
        menu:triggerClose()
        menu:triggerEvent('remove', menu)
    end
end

-- vRP 1 menus ----------------------------------------------------------------------------------------------------------

--- vRP 1 `openMenu`: `menudef.name`, `menudef.onclose(player)`, choices `[label] = { fn(player, choice, mod), desc }`
--- (sorted by label). Replaces the player's open vRP 1 menu (its `onclose` runs after, as in vRP).
---@param source any
---@param menudef table
---@param owner? string
---@param main? boolean
function ui.openMenu(source, menudef, owner, main)
    source = online(source)
    if not source or type(menudef) ~= 'table' then return end
    local keys = {}
    for key, choice in pairs(menudef) do
        if key ~= 'name' and key ~= 'onclose' and key ~= 'css' and type(choice) == 'table' then keys[#keys + 1] = key end
    end
    table.sort(keys, function(a, b) return tostring(a):upper() < tostring(b):upper() end)
    ---@type VrpMenuEntry
    local entry = { id = newId(), owner = owner or GetInvokingResource() or RESOURCE, def = menudef, keys = keys, main = main }
    local stack = stackOf(source)
    local top = stack[#stack]
    if top and top.def then
        stack[#stack] = entry
        CreateThread(function() call(top.def.onclose, source) end)
    else
        if top and top.menu then top.menu:triggerClose() end
        stack[#stack + 1] = entry
    end
    show(source)
end

--- Closes the player's top menu (vRP 1 or 2) and shows the one under it.
---@param source any
function ui.closeMenu(source)
    source = online(source)
    local stack = source and stacks[source]
    if not stack or #stack == 0 then return end
    remove(source --[[@as integer]], #stack)
    reopen(source --[[@as integer]])
end

---@type table<string, { fn: any, owner: string }[]>
local builders = {}
local mainAnnounced = false

--- Clients learn once that the main menu has content (they then add its key).
local function announceMain()
    if mainAnnounced then return end
    mainAnnounced = true
    TriggerClientEvent('ai-core:vrp:mainMenu', -1)
end

---@return boolean
local function hasMain()
    return (builders.main and #builders.main > 0) or (v2.builders.main and #v2.builders.main > 0) or false
end

--- vRP 1 `registerMenuBuilder(name, builder(add, data))`.
---@param name string
---@param builder any
---@param owner? string
function ui.registerMenuBuilder(name, builder, owner)
    if type(name) ~= 'string' or not isCallable(builder) then return end
    local list = builders[name] or {}
    builders[name] = list
    list[#list + 1] = { fn = builder, owner = owner or GetInvokingResource() or RESOURCE }
    if name == 'main' then announceMain() end
end

local BUILD_TIMEOUT_MS = 5000

--- vRP 1 `buildMenu(name, data)`: the choices every builder added (waits for each `add`, at most 5 s).
---@param name string
---@param data any
---@return table
function ui.buildMenu(name, data)
    local list = builders[name]
    if not list or #list == 0 then return {} end
    local choices, count = {}, #list
    return settle(function(answer)
        for _, builder in ipairs({ table.unpack(list) }) do
            local added = false
            local function add(more)
                if added then return end
                added = true
                if type(more) == 'table' then
                    for key, choice in pairs(more) do choices[key] = choice end
                end
                count = count - 1
                if count == 0 then answer(choices) end
            end
            call(builder.fn, add, data)
        end
        SetTimeout(BUILD_TIMEOUT_MS, function() answer(choices) end)
    end)
end

--- vRP 1 `openMainMenu`: the menu built from every `main` builder.
---@param source any
function ui.openMainMenu(source)
    source = online(source)
    if not source then return end
    local hasV2 = v2.builders.main and #v2.builders.main > 0
    if hasV2 and v2.user then
        local user = v2.user(source)
        if user then return v2.openMenu(user, 'main') end
    end
    if not builders.main or #builders.main == 0 then return end
    local menudata = ui.buildMenu('main', { player = source })
    ui.openMenu(source, menudata, RESOURCE, true)
end

-- Prompt and request ---------------------------------------------------------------------------------------------------

---@type table<integer, { id: integer, answer: fun(text: string) }>
local prompts = {}
---@type table<integer, { source: integer, answer: fun(ok: boolean) }>
local requests = {}

local PROMPT_MAX = 4000

--- vRP's `prompt`: the text the player typed (`''` on cancel or drop). One prompt per player: a new one answers the
--- open one with `''`.
---@param source any
---@param title any
---@param default any
---@param cb? any `cb(text)`: answer there, nothing waits
---@return string|nil
function ui.prompt(source, title, default, cb)
    return settle(function(answer)
        source = online(source)
        if not source then return answer('') end
        local previous = prompts[source]
        local id = newId()
        prompts[source] = { id = id, answer = answer }
        if previous then previous.answer('') end
        BridgeVRP.client._prompt(source, tostring(title or ''), tostring(default or ''), id)
    end, cb)
end

--- vRP's `request`: true when the player said yes within `seconds` (false on no, timeout or drop).
---@param source any
---@param text any
---@param seconds any
---@param cb? any `cb(ok)`: answer there, nothing waits
---@return boolean|nil
function ui.request(source, text, seconds, cb)
    return settle(function(answer)
        source = online(source)
        if not source then return answer(false) end
        local time = math.max(1, math.min(600, math.floor(tonumber(seconds) or 15)))
        local id = newId()
        requests[id] = { source = source, answer = answer }
        BridgeVRP.client._request(source, id, tostring(text or ''), time)
        SetTimeout(time * 1000, function()
            if requests[id] then
                requests[id] = nil
                answer(false)
            end
        end)
    end, cb)
end

-- vRP 2 / 3 menus ------------------------------------------------------------------------------------------------------


---@type table<function, string> vRP 2 builder -> resource that registered it
local v2Owners = {}

---@class VrpMenu
---@field user table the vRP 2 user (`user.source`)
---@field name string
---@field data table build data
---@field title string
---@field options table[] `{ title, action, description, value }`
---@field css table
---@field closed boolean
---@field event_listeners table<string, table<any, boolean>>
local Menu = class('Menu')
v2.Menu = Menu

---@param user table
---@param name string
---@param data table
function Menu:__construct(user, name, data)
    self.event_listeners = {}
    self.user = user
    self.name = name
    self.data = data
end

--- Events: `close(menu)`, `remove(menu)`, `select(menu, id)` (never fired: ai-lib's menu reports no hover to the server).
---@param name string
---@param callback any
function Menu:listen(name, callback)
    local listeners = self.event_listeners[name] or {}
    self.event_listeners[name] = listeners
    listeners[callback] = true
end

---@param name string
---@param callback any
function Menu:unlisten(name, callback)
    local listeners = self.event_listeners[name]
    if listeners then listeners[callback] = nil end
end

---@param name string
function Menu:triggerEvent(name, ...)
    local listeners = self.event_listeners[name]
    if not listeners then return end
    for callback in pairs(listeners) do call(callback, ...) end
end

function Menu:initialize()
    self.title = self.name
    self.options = {}
    self.css = {}
    self.closed = false
end

function Menu:triggerClose()
    if self.closed then return end
    self.closed = true
    self:triggerEvent('close', self)
end

---@param id integer
function Menu:triggerSelect(id)
    if self.options[id] then self:triggerEvent('select', self, id) end
end

---@param id integer
---@param mod integer
function Menu:triggerOption(id, mod)
    local option = self.options[id]
    if option and option[2] then call(option[2], self, option[4], mod, id) end
end

--- Changes an option's title and / or description; the player sees it at once when this is the open menu.
---@param id integer
---@param title? string
---@param description? string|function
function Menu:updateOption(id, title, description)
    local option = self.options[id]
    if not option then return end
    if title then option[1] = title end
    if description then option[3] = description end
    local source = online(self.user and self.user.source)
    local top = source and topOf(source)
    if not top or top.menu ~= self or shown[source] ~= top.id then return end
    local desc = option[3]
    if isCallable(desc) then desc = call(desc, self, option[4]) end
    BridgeVRP.client._updateMenuOption(source, top.id, id, tostring(option[1] or ''), type(desc) == 'string' and desc or nil)
end

--- `action(menu, value, mod, index)`; `description` a text or `fn(menu, value)`; `value` defaults to the index.
---@param title string
---@param action? function
---@param description? string|function
---@param value? any
---@param index? integer
function Menu:addOption(title, action, description, value, index)
    if index then
        table.insert(self.options, index, { title, action, description, value or #self.options + 1 })
    else
        table.insert(self.options, { title, action, description, value or #self.options + 1 })
    end
end

---@param name string
---@param builder function `builder(menu)`
---@param owner? string
function v2.registerMenuBuilder(name, builder, owner)
    if type(name) ~= 'string' or not isCallable(builder) then return end
    local list = v2.builders[name] or {}
    v2.builders[name] = list
    list[#list + 1] = builder
    v2Owners[builder] = owner or GetInvokingResource() or RESOURCE
    if name == 'main' then announceMain() end
end

---@param menu VrpMenu
function v2.buildMenu(menu)
    buildV2(menu)
end

--- vRP 2 `user:openMenu(name, data)`: builds the menu, puts it on top of the player's stack (the previous one gets
--- `close`) and returns it.
---@param user table
---@param name string
---@param data? table
---@return VrpMenu|nil
function v2.openMenu(user, name, data)
    local source = online(type(user) == 'table' and user.source)
    if not source then return nil end
    local menu = Menu(user, tostring(name), type(data) == 'table' and data or {})
    menu:initialize()
    buildV2(menu)
    local stack = stackOf(source)
    local previous = stack[#stack]
    stack[#stack + 1] = { id = newId(), menu = menu }
    show(source)
    if previous and previous.menu then previous.menu:triggerClose() end
    return menu
end

--- vRP 2 `user:closeMenu(menu)`: closes `menu` (default: the open one); the one under it is built again and shown.
---@param user table
---@param menu? VrpMenu
function v2.closeMenu(user, menu)
    local source = online(type(user) == 'table' and user.source)
    local stack = source and stacks[source]
    if not stack or #stack == 0 then return end
    ---@type integer|nil
    local index = #stack
    if menu then
        index = nil
        for i = #stack, 1, -1 do
            if stack[i].menu == menu then index = i break end
        end
        if not index then return end
    end
    local wasTop = index == #stack
    remove(source --[[@as integer]], index --[[@as integer]])
    if wasTop then reopen(source --[[@as integer]]) end
end

--- vRP 2 `user:actualizeMenu()`: builds the open menu again and shows it.
---@param user table
function v2.actualizeMenu(user)
    local source = online(type(user) == 'table' and user.source)
    local top = source and topOf(source)
    if not top then return end
    if top.menu then
        reopen(source --[[@as integer]])
    else
        top.id = newId()
        show(source --[[@as integer]])
    end
end

--- vRP 2 `user:closeMenus()`.
---@param user table
function v2.closeMenus(user)
    local source = online(type(user) == 'table' and user.source)
    local stack = source and stacks[source]
    while stack and #stack > 0 do remove(source --[[@as integer]], #stack) end
    if source then show(source) end
end

--- vRP 2 `user:getMenu()`: the open vRP 2 menu (nil when none, or when a vRP 1 menu is on top).
---@param user table
---@return VrpMenu|nil
function v2.getMenu(user)
    local source = online(type(user) == 'table' and user.source)
    local top = source and topOf(source)
    return top and top.menu or nil
end

-- vRP 1 proxy functions ------------------------------------------------------------------------------------------------

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

-- Cleanup ---------------------------------------------------------------------------------------------------------------

--- A player who leaves or lets the character go: menus closed with their callbacks (vRP closes them on leave),
--- prompt and requests answered empty.
---@param source integer
local function release(source)
    local stack = stacks[source]
    while stack and #stack > 0 do remove(source, #stack) end
    stacks[source], shown[source] = nil, nil
    local prompt = prompts[source]
    prompts[source] = nil
    if prompt then prompt.answer('') end
    for id, request in pairs(requests) do
        if request.source == source then
            requests[id] = nil
            request.answer(false)
        end
    end
end

Bridge.on('loaded', function(source)
    if mainAnnounced then TriggerClientEvent('ai-core:vrp:mainMenu', source) end
end)
Bridge.on('unloaded', release)
AddEventHandler('playerDropped', function() release(tonumber(source) --[[@as integer]]) end)

-- A stopped resource takes its menus and builders with it, without calling back into it.
AddEventHandler('onResourceStop', function(resource)
    if resource == RESOURCE then return end
    for source, stack in pairs(stacks) do
        local top = stack[#stack]
        for i = #stack, 1, -1 do
            if stack[i].owner == resource then table.remove(stack, i) end
        end
        if stack[#stack] ~= top then reopen(source) end
    end
    for _, list in pairs(builders) do
        for i = #list, 1, -1 do
            if list[i].owner == resource then table.remove(list, i) end
        end
    end
    for _, list in pairs(v2.builders) do
        for i = #list, 1, -1 do
            if v2Owners[list[i]] == resource then
                v2Owners[list[i]] = nil
                table.remove(list, i)
            end
        end
    end
end)
