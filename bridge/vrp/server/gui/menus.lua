-- vRP 1 menus, menu builders and the main menu.

local RESOURCE = GetCurrentResourceName()
local ui, gui = BridgeVRP.ui, BridgeVRP.gui
local v2 = ui.v2
local isCallable, call, online, settle, newId = gui.isCallable, gui.call, gui.online, gui.settle, gui.newId
local stackOf, show, reopen, remove, stacks = gui.stackOf, gui.show, gui.reopen, gui.remove, gui.stacks

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

Bridge.on('loaded', function(source)
    if mainAnnounced then TriggerClientEvent('ai-core:vrp:mainMenu', source) end
end)

gui.builders = builders
gui.announceMain = announceMain
gui.hasMain = hasMain
