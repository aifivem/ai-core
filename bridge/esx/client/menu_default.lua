-- ESX on ai-core, client UI: esx_menu_default's `default` menu type (rows, sliders) on ai-core's menu.

local clean = BridgeUI.clean
local menuData, playerCancel = BridgeESXClient.menuData, BridgeESXClient.playerCancel

---@param e table
local function sliderText(e)
    if type(e.options) == 'table' then return clean(e.options[(tonumber(e.value) or 0) + 1]) end
    return tostring(e.value or 0)
end

--- A slider row asks for its value; the menu's change hears it, a menu without change gets the submit (shops).
---@param menu ESXMenu
---@param e table
local function pickSlider(menu, e)
    ---@type BridgeDialog
    local sub
    local function chosen(value)
        BridgeUI.close(sub)
        if value == nil then return end
        e.value = value
        local data = menuData(menu, { current = e, elements = menu.data.elements })
        if BridgeUI.isCallable(menu.change) then
            BridgeUI.call(menu.change, data, menu)
        else
            BridgeUI.call(menu.submit, data, menu)
        end
    end
    if type(e.options) == 'table' then
        sub = {
            kind = 'menu',
            owner = menu.resourceName,
            build = function()
                local items = {}
                for j, option in ipairs(e.options) do
                    items[j] = { id = tostring(j - 1), label = clean(option), icon = j - 1 == e.value and 'check' or nil }
                end
                return { title = clean(e.label), items = items, back = true }
            end,
            answer = function(value) chosen(value ~= nil and value ~= '__back' and tonumber(value) or nil) end,
        }
    else
        sub = {
            kind = 'input',
            owner = menu.resourceName,
            build = function()
                return {
                    title = clean(e.label),
                    confirm = BridgeUI.text('BRIDGE_CONFIRM'),
                    fields = { { name = 'value', label = '', type = 'number', min = tonumber(e.min) or 0, max = tonumber(e.max), placeholder = tostring(e.value or '') } },
                }
            end,
            answer = function(values)
                local v = type(values) == 'table' and tonumber(values.value)
                chosen(v and math.floor(v) or nil)
            end,
        }
    end
    BridgeUI.open(sub)
end

BridgeESXClient.registerMenuType('default', {
    kind = 'menu',
    build = function(data)
        local items = {}
        for i, e in ipairs(data.elements or {}) do
            local label = clean(e.label)
            if e.type == 'slider' then label = ('%s: < %s >'):format(label, sliderText(e)) end
            items[i] = {
                id = tostring(i),
                label = label,
                icon = BridgeUI.icon(e.icon),
                description = e.description and clean(e.description) or nil,
                disabled = (e.disabled or e.unselectable) and true or false,
            }
        end
        return { title = clean(data.title), items = items, back = #ESX.UI.Menu.Opened > 1 }
    end,
    answer = function(menu, value)
        if value == nil or value == '__back' then return playerCancel(menu) end
        local e = menu.data.elements[tonumber(value) or 0]
        if not e then return end
        if e.type == 'slider' then return pickSlider(menu, e) end
        BridgeUI.call(menu.submit, menuData(menu, { current = e, elements = menu.data.elements }), menu)
    end,
})
