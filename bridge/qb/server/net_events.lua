-- qb-core's net events (client values are checked; every one goes through the bridge's rate gate).

local core = Bridge.core
local getPlayer, granted, mayUse = BridgeQB.getPlayer, BridgeQB.granted, BridgeQB.mayUse

---@param src integer
---@return QBPlayer|nil
local function caller(src)
    if not Bridge.players[src] or not Bridge.allow(src) then return nil end
    return getPlayer(src)
end

-- qb-core's duty toggle (duty points, job menus).
RegisterNetEvent('QBCore:ToggleDuty', function()
    local src = source
    local player = caller(src)
    if not player then return end
    local job = player.PlayerData.job
    core:SetDuty(src, (not job.onduty) and job.name or nil)
end)

-- qb-adminmenu style command calls without the chat.
RegisterNetEvent('QBCore:CallCommand', function(command, args)
    local src = source
    if type(command) ~= 'string' then return end
    local entry = QBCore.Commands.List[command:lower()]
    if not entry or not caller(src) or not mayUse(src, entry) then return end
    local words = {}
    if type(args) == 'table' then
        for i = 1, math.min(#args, 32) do words[i] = tostring(args[i]) end
    end
    if entry.argsrequired and #entry.arguments ~= 0 and not words[#entry.arguments] then return end
    entry.callback(src, words, '/' .. command .. ' ' .. table.concat(words, ' '))
end)

-- Closing the server to everyone without qb-core's `qbadmin.join` ace (or ai-core admin): joins are refused through
-- ai-core's connection gate, connected players without the whitelist level are kicked.
RegisterNetEvent('QBCore:Server:CloseServer', function(reason)
    local src = source
    if not Bridge.allow(src) or not QBCore.Functions.HasPermission(src, 'admin') then return end
    QBCore.Config.Server.Closed = true
    QBCore.Config.Server.ClosedReason = type(reason) == 'string' and reason:sub(1, 200) or 'No reason specified'
    for id in pairs(QBCore.Players) do
        if not QBCore.Functions.HasPermission(id, QBCore.Config.Server.WhitelistPermission) then
            QBCore.Functions.Kick(id, QBCore.Config.Server.ClosedReason)
        end
    end
end)

RegisterNetEvent('QBCore:Server:OpenServer', function()
    local src = source
    if not Bridge.allow(src) or not QBCore.Functions.HasPermission(src, 'admin') then return end
    QBCore.Config.Server.Closed = false
end)

CreateThread(function()
    core:AddConnectionCheck('qb-core:closed', function(source)
        if not QBCore.Config.Server.Closed then return nil end
        local id = tostring(source)
        if IsPlayerAceAllowed(id, 'qbadmin.join') or IsPlayerAceAllowed(id, 'ai.admin') then return nil end
        return QBCore.Config.Server.ClosedReason
    end)
end)

-- Old qb-inventory: the client asks to use an item. The stack is read from the inventory, never taken from the client.
RegisterNetEvent('QBCore:Server:UseItem', function(item)
    local src = source
    local name = type(item) == 'table' and item.name or item
    if type(name) ~= 'string' or not caller(src) then return end
    local slot = type(item) == 'table' and tonumber(item.slot) or nil
    for _, stack in ipairs(core:GetItems(src) or {}) do
        if stack.name == name and (not slot or stack.slot == slot) then
            return Bridge.useItem(src, name, BridgeQB.qbStack(stack))
        end
    end
end)

-- Old scripts: the client takes its own items (never gives: `QBCore:Server:AddItem` is not answered).
RegisterNetEvent('QBCore:Server:RemoveItem', function(itemName, amount, slot)
    local src = source
    local count = tonumber(amount) or 1
    if type(itemName) ~= 'string' or count <= 0 or math.type(count) ~= 'integer' or not caller(src) then return end
    core:RemoveItem(src, itemName, count, nil, tonumber(slot))
end)

-- Old HUDs: the client reports its needs. Only a change that hurts the player is taken (less hunger / thirst, more
-- stress); anything else could be a cheat.
local SELF_REPORTED = { hunger = -1, thirst = -1, stress = 1 }
RegisterNetEvent('QBCore:Server:SetMetaData', function(key, value)
    local src = source
    local direction = SELF_REPORTED[key]
    local number = tonumber(value)
    local player = direction and number and caller(src)
    if not player then return end
    local current = tonumber(player.PlayerData.metadata[key]) or 0
    number = math.min(100, math.max(0, number --[[@as number]]))
    if (number - current) * direction > 0 then core:SetMeta(src, key, number) end
end)

AddEventHandler('playerDropped', function()
    local src = source
    local license = Bridge.license(src)
    if license then QBCore.Player_Buckets[license] = nil end
    for name in pairs(granted[src] or {}) do ExecuteCommand(('remove_principal player.%d qbcore.%s'):format(src, name)) end
    granted[src] = nil
end)

AddEventHandler('onResourceStop', function(resource)
    for name, entry in pairs(QBCore.UsableItems) do
        if entry.resource == resource then QBCore.UsableItems[name] = nil end
    end
end)
