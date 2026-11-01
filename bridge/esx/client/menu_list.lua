-- ESX on ai-core, client UI: esx_menu_list's `list` menu type (rows with buttons) on ai-core's menu.

local clean = BridgeUI.clean
local menuData, playerCancel = BridgeESXClient.menuData, BridgeESXClient.playerCancel

BridgeESXClient.registerMenuType('list', {
    kind = 'menu',
    build = function(data)
        local items = {}
        for r, row in ipairs(data.rows or {}) do
            local texts, buttons = {}, {}
            for _, col in ipairs(row.cols or {}) do
                col = tostring(col)
                for label, value in col:gmatch('{{(.-)|(.-)}}') do buttons[#buttons + 1] = { label, value } end
                local text = clean(col:gsub('{{.-}}', ''))
                if text:match('%S') then texts[#texts + 1] = text end
            end
            local line = table.concat(texts, ' | ')
            if #buttons == 0 then items[#items + 1] = { id = 'row:' .. r, label = line, disabled = true } end
            for b, button in ipairs(buttons) do
                items[#items + 1] = { id = ('%d:%d'):format(r, b), label = ('%s - %s'):format(line, clean(button[1])) }
            end
        end
        local head = {}
        for i, h in ipairs(data.head or {}) do head[i] = clean(h) end
        return { title = clean(data.title or table.concat(head, ' | ')), items = items, back = #ESX.UI.Menu.Opened > 1 }
    end,
    answer = function(menu, value)
        if value == nil or value == '__back' then return playerCancel(menu) end
        local r, b = tostring(value):match('^(%d+):(%d+)$')
        local row = (menu.data.rows or {})[tonumber(r) or 0]
        if not row then return end
        local button = 0
        for _, col in ipairs(row.cols or {}) do
            for _, v in tostring(col):gmatch('{{(.-)|(.-)}}') do
                button = button + 1
                if button == tonumber(b) then
                    if type(row.data) == 'table' then row.data.currentRow = tonumber(r) end
                    return BridgeUI.call(menu.submit, menuData(menu, { data = row.data, value = v }), menu)
                end
            end
        end
    end,
})
