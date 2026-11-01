-- ESX on ai-core, client UI: ESX.UI.Menu (open, close, registered types). The esx_menu_default / dialog / list types
-- are drawn by ai-core's menu and input dialog (menu_types.lua). Logic follows es_extended 1.12.4 (GPL-3.0).

local RESOURCE = GetCurrentResourceName()

---@class ESXMenu
---@field type string
---@field namespace string
---@field resourceName string
---@field name string
---@field data table
---@field submit? function
---@field cancel? function
---@field change? function
---@field close fun()
---@field update fun(query: table, newData: table)
---@field refresh fun()
---@field setElement fun(i: integer, key: string, val: any)
---@field setElements fun(newElements: table)
---@field setTitle fun(val: string)
---@field removeElement fun(query: table)

ESX.UI = ESX.UI or {}
ESX.UI.Menu = { RegisteredTypes = {}, Opened = {} }

---@param menuType string
---@param open fun(namespace: string, name: string, data: table)
---@param close fun(namespace: string, name: string)
function ESX.UI.Menu.RegisterType(menuType, open, close)
    ESX.UI.Menu.RegisteredTypes[menuType] = { open = open, close = close }
end

---@param menu ESXMenu
---@param menuType string
---@param namespace string
---@param name string
local function matches(menu, menuType, namespace, name)
    return menu.type == menuType and menu.namespace == namespace and menu.name == name
end

---@param menuType string
---@param namespace string
---@param name string
local function forget(menuType, namespace, name)
    local opened = ESX.UI.Menu.Opened
    for i = #opened, 1, -1 do
        if matches(opened[i], menuType, namespace, name) then table.remove(opened, i) end
    end
end

---@param menuType string
---@param namespace string
---@param name string
---@param data table
---@param submit? function
---@param cancel? function
---@param change? function
---@param close? function
---@return ESXMenu
function ESX.UI.Menu.Open(menuType, namespace, name, data, submit, cancel, change, close)
    local registered = ESX.UI.Menu.RegisteredTypes[menuType]
    if not registered then error(('ESX menu type "%s" is not registered'):format(tostring(menuType)), 2) end
    local menu = {
        type = menuType,
        namespace = namespace,
        resourceName = GetInvokingResource() or RESOURCE,
        name = name,
        data = type(data) == 'table' and data or {},
        submit = submit,
        cancel = cancel,
        change = change,
    } --[[@as ESXMenu]]
    menu.data.elements = menu.data.elements or {}

    function menu.close()
        BridgeUI.call(ESX.UI.Menu.RegisteredTypes[menuType].close, namespace, name)
        forget(menuType, namespace, name)
        BridgeUI.call(close)
    end

    function menu.update(query, newData)
        for _, element in ipairs(menu.data.elements) do
            local match = true
            for k, v in pairs(query) do
                if element[k] ~= v then match = false end
            end
            if match then
                for k, v in pairs(newData) do element[k] = v end
            end
        end
    end

    function menu.refresh() BridgeUI.call(ESX.UI.Menu.RegisteredTypes[menuType].open, namespace, name, menu.data) end
    function menu.setElement(i, key, val) menu.data.elements[i][key] = val end
    function menu.setElements(newElements) menu.data.elements = newElements end
    function menu.setTitle(val) menu.data.title = val end

    function menu.removeElement(query)
        local elements = menu.data.elements
        for i = #elements, 1, -1 do
            for k, v in pairs(query) do
                if elements[i] and elements[i][k] == v then
                    table.remove(elements, i)
                    break
                end
            end
        end
    end

    ESX.UI.Menu.Opened[#ESX.UI.Menu.Opened + 1] = menu
    BridgeUI.call(registered.open, namespace, name, menu.data)
    return menu
end

---@param menu ESXMenu
local function cancelMenu(menu)
    BridgeUI.call(ESX.UI.Menu.RegisteredTypes[menu.type].close, menu.namespace, menu.name)
    BridgeUI.call(menu.cancel, menu.data, menu)
end

---@param menuType string
---@param namespace string
---@param name string
---@param cancel? boolean the close counts as a cancel
function ESX.UI.Menu.Close(menuType, namespace, name, cancel)
    local opened = ESX.UI.Menu.Opened
    for i = #opened, 1, -1 do
        local menu = opened[i]
        if menu and matches(menu, menuType, namespace, name) then
            if cancel then cancelMenu(menu) else menu.close() end
            forget(menuType, namespace, name)
        end
    end
end

---@param cancel? boolean the close counts as a cancel
function ESX.UI.Menu.CloseAll(cancel)
    local opened = ESX.UI.Menu.Opened
    for i = #opened, 1, -1 do
        local menu = opened[i]
        if menu then
            if cancel then cancelMenu(menu) else menu.close() end
        end
    end
    ESX.UI.Menu.Opened = {}
end

---@param menuType string
---@param namespace string
---@param name string
---@return ESXMenu|nil
function ESX.UI.Menu.GetOpened(menuType, namespace, name)
    for _, menu in ipairs(ESX.UI.Menu.Opened) do
        if matches(menu, menuType, namespace, name) then return menu end
    end
end

---@return ESXMenu[]
function ESX.UI.Menu.GetOpenedMenus() return ESX.UI.Menu.Opened end

ESX.UI.Menu.IsOpen = ESX.UI.Menu.GetOpened

AddEventHandler('onClientResourceStop', function(resource)
    local opened = ESX.UI.Menu.Opened
    for i = #opened, 1, -1 do
        if opened[i].resourceName == resource then table.remove(opened, i) end
    end
end)
