-- qb-menu on ai-lib's menu (through bridge/core/client/dialogs.lua).

local RESOURCE = GetCurrentResourceName()
local clean = BridgeUI.clean

---@class QBMenuItem
---@field header? string
---@field txt? string
---@field icon? string
---@field isMenuHeader? boolean
---@field disabled? boolean
---@field hidden? boolean
---@field params? { event?: string|function, args?: any, isServer?: boolean, isCommand?: boolean, isQBCommand?: boolean, isAction?: boolean }

---@type BridgeDialog|nil
local qbMenu = nil

---@param item QBMenuItem
local function runItem(item)
    local params = type(item.params) == 'table' and item.params or {}
    local event = params.event
    if not event then return end
    if params.isServer then
        TriggerServerEvent(event, params.args)
    elseif params.isCommand then
        ExecuteCommand(event)
    elseif params.isQBCommand then
        TriggerServerEvent('QBCore:CallCommand', event, params.args)
    elseif params.isAction then
        BridgeUI.call(event, params.args)
    else
        TriggerEvent(event, params.args)
    end
end

---@param data QBMenuItem[]
---@param sort? boolean
---@param skipFirst? boolean
local function openMenu(data, sort, skipFirst)
    if type(data) ~= 'table' or not next(data) then return end
    local items = {}
    for _, item in ipairs(data) do
        if type(item) == 'table' and not item.hidden then items[#items + 1] = item end
    end
    if sort then
        local first = skipFirst and table.remove(items, 1) or nil
        table.sort(items, function(a, b) return clean(a.header):upper() < clean(b.header):upper() end)
        if first then table.insert(items, 1, first) end
    end
    ---@type BridgeDialog
    local dialog
    dialog = {
        kind = 'menu',
        owner = GetInvokingResource() or RESOURCE,
        build = function()
            local rows, title = {}, ''
            for i, item in ipairs(items) do
                if item.isMenuHeader and title == '' and i == 1 then
                    title = clean(item.header)
                    if item.txt then rows[#rows + 1] = { id = 'h', label = clean(item.txt), disabled = true } end
                else
                    rows[#rows + 1] = {
                        id = tostring(i),
                        label = clean(item.header),
                        description = item.txt and clean(item.txt) or nil,
                        icon = BridgeUI.icon(item.icon),
                        disabled = (item.disabled or item.isMenuHeader) and true or false,
                    }
                end
            end
            return { title = title, items = rows }
        end,
        answer = function(value)
            if qbMenu == dialog then qbMenu = nil end
            BridgeUI.close(dialog)
            local item = items[tonumber(value) or 0]
            if item then runItem(item) end
        end,
    }
    local last = qbMenu
    qbMenu = dialog
    BridgeUI.open(dialog, last)
end

local function closeMenu()
    local dialog = qbMenu
    qbMenu = nil
    if dialog then BridgeUI.close(dialog) end
end

BridgeClient.provideExport('qb-menu', 'openMenu', openMenu)
BridgeClient.provideExport('qb-menu', 'closeMenu', closeMenu)
-- showHeader shows the menu without focus; ai-core has no unfocused menu, so it is not shown.
BridgeClient.provideExport('qb-menu', 'showHeader', function() end)
RegisterNetEvent('qb-menu:client:openMenu', openMenu)
RegisterNetEvent('qb-menu:client:closeMenu', closeMenu)

AddEventHandler('onClientResourceStop', function(resource)
    if qbMenu and qbMenu.owner == resource then qbMenu = nil end
end)
