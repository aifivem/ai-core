-- ESX on ai-core, client UI: ESX menu types drawn by ai-core's menu and input dialog (the esx_menu_default / dialog /
-- list types register through `BridgeESXClient.registerMenuType`: menu_default.lua, menu_dialog.lua, menu_list.lua).

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
BridgeESXClient.menuData, BridgeESXClient.playerCancel = menuData, playerCancel

---@class ESXBridgeMenuType
---@field kind 'menu'|'input'
---@field build fun(data: table): table
---@field answer fun(menu: ESXMenu, value: any)

--- Registers an ESX menu type: `def.build` makes the ai-lib request from the menu's data, `def.answer` handles the pick.
---@param menuType string
---@param def ESXBridgeMenuType
function BridgeESXClient.registerMenuType(menuType, def)
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
