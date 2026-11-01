-- The Qbox parts of a loaded player's object: Qbox's PlayerData fields and the player functions the QB object lacks.

local core = Bridge.core
local userIds, moneyAmount, runHooks = BridgeQbox.userIds, BridgeQbox.moneyAmount, BridgeQbox.runHooks
local jobMap, gangMap = BridgeQbox.jobMap, BridgeQbox.gangMap

---@param source integer
---@param items string|string[]|table<string, integer>
---@param amount? integer
---@return boolean
local function hasItem(source, items, amount)
    local inv = Bridge.inventory()
    if type(items) ~= 'table' then return inv:GetItemCount(source, tostring(items)) >= (tonumber(amount) or 1) end
    if next(items) == nil then return false end
    local list = items[1] ~= nil
    for key, value in pairs(items) do
        local name = list and value or key
        local need = tonumber(amount) or (list and 1 or tonumber(value) or 1)
        if inv:GetItemCount(source, tostring(name)) < need then return false end
    end
    return true
end

---@param stack table|nil
---@return table|nil
local function qbItem(stack)
    if not stack then return nil end
    return { name = stack.name, label = stack.label, count = stack.count, amount = stack.count, metadata = stack.metadata, info = stack.metadata, slot = stack.slot, weight = stack.weight }
end

--- Adds Qbox's PlayerData fields and the Qbox player functions the QB object lacks (never replaces one).
---@param source integer
local function extendPlayer(source)
    local player = BridgeQB.getPlayer(source)
    local mirror = Bridge.players[source]
    if not player or not mirror then return end
    local data = player.PlayerData --[[@as table]]
    data.userId = userIds[source]
    data.jobs, data.gangs = jobMap(mirror), gangMap(mirror)
    data.job.bankAuth = data.job.isboss == true
    data.gang.bankAuth = data.gang.isboss == true
    BridgeQbox.fillMeta(data.metadata)

    local fns = player.Functions --[[@as table<string, function>]]
    local function add(name, fn)
        if fns[name] == nil then fns[name] = fn end
    end
    -- Money changes through the player object run the same hooks as the exports.
    for _, pair in ipairs({ { 'AddMoney', 'addMoney' }, { 'RemoveMoney', 'removeMoney' }, { 'SetMoney', 'setMoney' } }) do
        local base, event = fns[pair[1]], pair[2]
        if base then
            fns[pair[1]] = function(moneyType, amount, reason)
                local valid = moneyAmount(amount)
                if valid and not runHooks(event, { source = source, moneyType = moneyType, amount = valid }) then return false end
                return base(moneyType, amount, reason)
            end
        end
    end
    add('SetPlayerData', function(key, value) BridgeQbox.setPlayerData(source, key, value) end)
    add('GetName', function() return ('%s %s'):format(data.charinfo.firstname, data.charinfo.lastname) end)
    add('Logout', function() Bridge.logout(source) end)
    add('HasItem', function(items, amount) return hasItem(source, items, amount) end)
    add('GetItemBySlot', function(slot)
        for _, stack in ipairs(Bridge.inventory():GetItems(source) or {}) do
            if stack.slot == tonumber(slot) then return qbItem(stack) end
        end
    end)
    add('ClearInventory', function() return Bridge.inventory():ClearInventory(source) end)
    add('SetInventory', function() error('Player.Functions.SetInventory is not supported: clear the inventory, then add the items') end)
    add('SetCreditCard', function(card) data.charinfo.card = card end)
    add('AddJobReputation', function(amount)
        amount = tonumber(amount)
        if not amount then return end
        local rep = {}
        for key, value in pairs(mirror.metadata.jobrep or data.metadata.jobrep or {}) do rep[key] = value end
        rep[data.job.name] = (rep[data.job.name] or 0) + amount
        core:SetMeta(source, 'jobrep', rep)
    end)
    local function getRep(rep) return rep and (mirror.metadata.rep or {})[rep] or 0 end
    local function setRep(rep, value)
        local reps = {}
        for key, v in pairs(mirror.metadata.rep or {}) do reps[key] = v end
        reps[rep] = value
        core:SetMeta(source, 'rep', reps)
    end
    add('GetRep', getRep)
    add('AddRep', function(rep, amount)
        amount = tonumber(amount)
        if rep and amount then setRep(rep, getRep(rep) + amount) end
    end)
    add('RemoveRep', function(rep, amount)
        amount = tonumber(amount)
        if rep and amount then setRep(rep, math.max(getRep(rep) - amount, 0)) end
    end)
    add('AddMethod', function(name, handler)
        if type(name) == 'string' then fns[name] = handler end
    end)
    add('AddField', function(name, value)
        if type(name) == 'string' then player[name] = value end
    end)
end

BridgeQbox.extendPlayer = extendPlayer
