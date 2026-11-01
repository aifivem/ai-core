-- ESX on ai-core, client side: ESX.SearchInventory and ESX.ShowInventory on ai-core's inventory layer.

--- ESX's inventory row for an item the player holds `count` of (label and weight from ai-core's item definitions);
--- nil for an item no definition knows that the player does not hold.
---@param name string
---@param count integer
---@return table|nil
local function itemRow(name, count)
    local definition = aiLib.inventory.itemDefinition(name)
    if not definition and count <= 0 then return nil end
    return {
        name = name,
        count = count,
        label = definition and definition.label or name,
        weight = definition and definition.weight or 0,
        usable = false,
        rare = false,
        canRemove = true,
    }
end

--- Puts fresh rows into `PlayerData.inventory` (by name) and tells the ESX imports once when one changed.
---@param rows table<string, table>
local function keepRows(rows)
    if not ESX.PlayerLoaded then return end
    local list = ESX.PlayerData.inventory or {}
    local changed = false
    for _, row in ipairs(list) do
        local fresh = rows[row.name]
        if fresh then
            rows[row.name] = nil
            if row.count ~= fresh.count then
                row.count = fresh.count
                changed = true
            end
        end
    end
    for _, row in pairs(rows) do
        list[#list + 1] = row
        changed = true
    end
    if changed then ESX.SetPlayerData('inventory', list) end
end

--- ESX's SearchInventory. Counts come from the active inventory's client count (`GetItemCount`), read at each call;
--- the rows read are kept in `ESX.PlayerData.inventory`. An inventory without a client count is read from that list
--- (filled by the inventory), else from ai-core's `HasItem`, which knows only whether the player has it: count 1 or 0.
---@param items string|string[]
---@param count? boolean
---@return any
function ESX.SearchInventory(items, count)
    local single
    if type(items) == 'string' then
        single, items = items, { items }
    end
    local listed = {}
    for _, row in ipairs(ESX.PlayerData.inventory or {}) do listed[row.name] = row end
    local data, fresh = {}, {}
    for i = 1, #items do
        local name = items[i]
        local held, row = aiLib.inventory.itemCount(name), nil
        if held ~= nil then
            row = itemRow(name, math.floor(tonumber(held) or 0))
            if row then fresh[name] = row end
        else
            row = listed[name]
            if not row and aiLib.inventory.hasItem(name, 1) == true then row = itemRow(name, 1) end
        end
        if count then
            data[name] = row and row.count or 0
        elseif row then
            data[name] = row
        end
    end
    if next(fresh) then keepRows(fresh) end
    if single then return data[single] end
    return data
end

--- Opens ai-core's inventory (whatever inventory runs).
function ESX.ShowInventory() aiLib.inventory.openInventory() end
