local V = BridgeVRP2
local vRP = V.vRP
local run, gui, ownerResource, coreExtension = V.run, V.gui, V.ownerResource, V.coreExtension
local items, ITEM_MENU, Inventory = V.items, V.itemMenu, V.inventory

-- GUI: menus, prompt and request through bridge/vrp/server/gui/.
local GUIUser = {}

---@return table|nil
function GUIUser:getMenu()
    local ui = gui()
    return ui and ui.v2.getMenu(self)
end

---@param name any
---@param data any
---@return table|nil
function GUIUser:openMenu(name, data)
    local ui = gui()
    return ui and ui.v2.openMenu(self, name, data)
end

---@param menu? table
function GUIUser:closeMenu(menu)
    local ui = gui()
    if ui then ui.v2.closeMenu(self, menu) end
end

function GUIUser:actualizeMenu()
    local ui = gui()
    if ui then ui.v2.actualizeMenu(self) end
end

function GUIUser:closeMenus()
    local ui = gui()
    if ui then ui.v2.closeMenus(self) end
end

--- The text the player typed (`''` on cancel); waits.
---@param title any
---@param default_text any
---@return string
function GUIUser:prompt(title, default_text)
    local ui = gui()
    return ui and ui.prompt(self.source, title, default_text) or ''
end

--- True when the player said yes within `time` seconds; waits.
---@param text any
---@param time any
---@return boolean
function GUIUser:request(text, time)
    local ui = gui()
    return ui and ui.request(self.source, text, time) == true or false
end

local GUI = coreExtension('GUI', { cfg = module('vrp', 'cfg/gui') }, nil, GUIUser)

--- `builder(menu)` fills menus named `name`; it goes when its script stops.
---@param name any
---@param builder any
function GUI:registerMenuBuilder(name, builder)
    local ui = gui()
    if ui then ui.v2.registerMenuBuilder(name, builder, ownerResource()) end
end

---@param menu table
function GUI:buildMenu(menu)
    local ui = gui()
    if ui then ui.v2.buildMenu(menu) end
end

if BridgeVRP.ui and BridgeVRP.ui.v2 then
    GUI.menu_builders = BridgeVRP.ui.v2.builders
    BridgeVRP.ui.v2.user = function(source) return vRP.users_by_source[source] end
    -- The menu of an item defined by a vRP 2 extension.
    BridgeVRP.ui.v2.registerMenuBuilder(ITEM_MENU, function(menu)
        local item = Inventory:computeItem(menu.data.fullid)
        if not item then return end
        menu.title = item.name
        if type(item.menu_builder) == 'function' then
            local own = items[item.args[1]]
            run(own and own.owner, item.menu_builder, item.args, menu)
        end
    end, 'ai-core')
end
