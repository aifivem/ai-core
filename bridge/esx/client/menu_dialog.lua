-- ESX on ai-core, client UI: esx_menu_dialog's `dialog` menu type on ai-core's input dialog.

local clean = BridgeUI.clean
local menuData, playerCancel = BridgeESXClient.menuData, BridgeESXClient.playerCancel

BridgeESXClient.registerMenuType('dialog', {
    kind = 'input',
    build = function(data)
        local big = data.type == 'big'
        return {
            title = clean(data.title),
            confirm = BridgeUI.text('BRIDGE_CONFIRM'),
            fields = { { name = 'value', label = '', type = 'text', multiline = big, maxLength = big and 1000 or 255, value = data.value ~= nil and tostring(data.value) or nil } },
        }
    end,
    answer = function(menu, values)
        if type(values) ~= 'table' then return playerCancel(menu) end
        local data = menuData(menu, { title = menu.data.title, type = menu.data.type, value = values.value })
        -- esx_menu_dialog: numbers are rounded and must be above 0, every value is trimmed to text.
        local number = tonumber(data.value)
        if number then
            data.value = ESX.Math.Round(number)
            if data.value <= 0 then return BridgeClient.notify(BridgeUI.text('BRIDGE_INPUT_NOT_ALLOWED'), 'error') end
        end
        data.value = ESX.Math.Trim(data.value)
        BridgeUI.call(menu.submit, data, menu)
    end,
})
