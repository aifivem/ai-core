-- vRP on ai-core, GUI server side: vRP 1 menus (`openMenu`, `closeMenu`, builders, main menu), vRP 2 / 3 menus
-- (`BridgeVRP.ui.v2`, for the GUI extension), `prompt` and `request`. The server keeps every menu, prompt and request
-- per player; bridge/vrp/client/gui/ shows them with ai-lib's menu and input dialog and answers on the rate-gated
-- "vRP" tunnel, each answer checked against the player it was opened for. API: bridge/vrp/CLAUDE.md (GUI).
-- Logic follows vRP 1.0 `modules/gui.lua` and vRP 2 `vrp/modules/gui.lua` (https://github.com/vRP-framework/vRP, MIT).
-- This file: the menu stack per player and what the GUI files share (`BridgeVRP.gui`).

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
---@field Menu table the vRP 2 menu class (bridge/vrp/server/gui/menu_class.lua)
---@field registerMenuBuilder fun(name: string, builder: function, owner?: string)
---@field buildMenu fun(menu: VrpMenu)
---@field openMenu fun(user: table, name: string, data?: table): VrpMenu|nil
---@field closeMenu fun(user: table, menu?: VrpMenu)
---@field actualizeMenu fun(user: table)
---@field closeMenus fun(user: table)
---@field getMenu fun(user: table): VrpMenu|nil
local v2 = { builders = {} }

---@class BridgeVRPUi
---@field openMenu fun(source: any, menudef: table, owner?: string, main?: boolean)
---@field closeMenu fun(source: any)
---@field registerMenuBuilder fun(name: string, builder: any, owner?: string)
---@field buildMenu fun(name: string, data: any): table
---@field openMainMenu fun(source: any)
---@field prompt fun(source: any, title: any, default: any, cb?: any): string|nil
---@field request fun(source: any, text: any, seconds: any, cb?: any): boolean|nil
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

--- What the GUI files (bridge/vrp/server/gui/*.lua) share; not an API for scripts.
BridgeVRP.gui = {
    isCallable = isCallable, call = call, online = online, settle = settle, stacks = stacks, shown = shown,
    newId = newId, stackOf = stackOf, topOf = topOf, show = show, buildV2 = buildV2, reopen = reopen, remove = remove,
}
