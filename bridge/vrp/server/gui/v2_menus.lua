-- vRP 2 / 3 menu builders and the user's menu stack functions (`BridgeVRP.ui.v2`).

local RESOURCE = GetCurrentResourceName()
local ui, gui = BridgeVRP.ui, BridgeVRP.gui
local v2 = ui.v2
local isCallable, online, newId, stackOf, topOf = gui.isCallable, gui.online, gui.newId, gui.stackOf, gui.topOf
local show, buildV2, reopen, remove, stacks = gui.show, gui.buildV2, gui.reopen, gui.remove, gui.stacks
local announceMain, Menu, v2Owners = gui.announceMain, gui.Menu, gui.v2Owners

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
