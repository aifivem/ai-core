-- vRP 2 / 3 menus: the `Menu` class (`BridgeVRP.ui.v2.Menu`).

local ui, gui = BridgeVRP.ui, BridgeVRP.gui
local v2 = ui.v2
local isCallable, call, online, topOf, shown = gui.isCallable, gui.call, gui.online, gui.topOf, gui.shown

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

gui.Menu = Menu
gui.v2Owners = v2Owners
