-- The `Functions` table of a loaded character's QB Player object: money, job, gang, metadata, reputation, items,
-- charinfo values, save and logout, all forwarded to ai-core.

local core = Bridge.core
local copy, META_DEFAULTS, CHARINFO_KEY = BridgeQB.copy, BridgeQB.metaDefaults, BridgeQB.charinfoKey
local itemsReadAt, qbStack, hasItem = BridgeQB.itemsReadAt, BridgeQB.qbStack, BridgeQB.hasItem
local playerUpdated = BridgeQB.playerUpdated

--- Built once per Player in `BridgeQB.build` (`SetPlayerData` and `UpdatePlayerData` are added there).
---@param source integer
---@param mirror table the bridge's mirror of the player
---@param data QBPlayerData
function BridgeQB.playerFunctions(source, mirror, data)
    local inv = Bridge.inventory

    ---@param name string
    ---@return table
    local function metaTable(name)
        local value = mirror.metadata[name]
        if type(value) == 'table' then return copy(value) end
        return copy(META_DEFAULTS[name]) or {}
    end

    local functions
    functions = {
        GetPlayerData = function() return data end,
        UpdateClient = function(key, value)
            if key then playerUpdated(source, key, value) return end
            -- qb-core fires this server-side too (server scripts may listen); the client half fires its own.
            ---@diagnostic disable-next-line: fivem/event-wrong-side
            TriggerEvent('QBCore:Player:SetPlayerData', data)
            playerUpdated(source, 'all', data)
        end,
        AddMoney = function(moneytype, amount, reason)
            if type(moneytype) ~= 'string' then return false end
            return core:AddMoney(source, moneytype:lower(), tonumber(amount) or -1, reason)
        end,
        RemoveMoney = function(moneytype, amount, reason)
            if type(moneytype) ~= 'string' then return false end
            return core:RemoveMoney(source, moneytype:lower(), tonumber(amount) or -1, reason)
        end,
        SetMoney = function(moneytype, amount, reason)
            if type(moneytype) ~= 'string' then return false end
            return core:SetMoney(source, moneytype:lower(), tonumber(amount) or -1, reason)
        end,
        GetMoney = function(moneytype)
            if type(moneytype) ~= 'string' then return false end
            local amount = mirror.money[moneytype:lower()]
            return amount ~= nil and amount or false
        end,
        SetJob = function(job, grade)
            if type(job) ~= 'string' then return false end
            return core:SetJob(source, job:lower(), tonumber(grade) or 0)
        end,
        SetJobDuty = function(onDuty) core:SetDuty(source, onDuty and data.job.name or nil) end,
        SetGang = function(gang, grade)
            if type(gang) ~= 'string' then return false end
            return core:SetGang(source, gang:lower(), tonumber(grade) or 0)
        end,
        SetMetaData = function(key, value)
            if type(key) ~= 'string' or key == CHARINFO_KEY then return end
            if (key == 'hunger' or key == 'thirst') and type(value) == 'number' then value = math.min(100, math.max(0, value)) end
            core:SetMeta(source, key, value)
        end,
        GetMetaData = function(key)
            if type(key) ~= 'string' or key == CHARINFO_KEY then return end
            local value = mirror.metadata[key]
            if value == nil then return copy(META_DEFAULTS[key]) end
            return value
        end,
        AddRep = function(rep, amount)
            local add = tonumber(amount)
            if type(rep) ~= 'string' or not add then return end
            local reps = metaTable('rep')
            reps[rep] = (tonumber(reps[rep]) or 0) + add
            core:SetMeta(source, 'rep', reps)
        end,
        RemoveRep = function(rep, amount)
            local remove = tonumber(amount)
            if type(rep) ~= 'string' or not remove then return end
            local reps = metaTable('rep')
            reps[rep] = math.max(0, (tonumber(reps[rep]) or 0) - remove)
            core:SetMeta(source, 'rep', reps)
        end,
        GetRep = function(rep)
            if type(rep) ~= 'string' then return end
            return tonumber(metaTable('rep')[rep]) or 0
        end,
        AddJobReputation = function(amount)
            local add = tonumber(amount)
            if not add then return end
            local reps = metaTable('jobrep')
            reps[data.job.name] = (tonumber(reps[data.job.name]) or 0) + add
            core:SetMeta(source, 'jobrep', reps)
        end,
        AddItem = function(item, amount, slot, info)
            local i = inv()
            local ok = i ~= nil and i:AddItem(source, item, amount or 1, info, slot) or false
            itemsReadAt[source] = nil
            return ok
        end,
        RemoveItem = function(item, amount, slot)
            local i = inv()
            local ok = i ~= nil and i:RemoveItem(source, item, amount or 1, nil, slot) or false
            itemsReadAt[source] = nil
            return ok
        end,
        GetItemByName = function(item)
            for _, stack in ipairs(core:GetItems(source) or {}) do
                if stack.name == item then return qbStack(stack) end
            end
        end,
        GetItemsByName = function(item)
            local out = {}
            for _, stack in ipairs(core:GetItems(source) or {}) do
                if stack.name == item then out[#out + 1] = qbStack(stack) end
            end
            return out
        end,
        GetItemBySlot = function(slot)
            slot = tonumber(slot) --[[@as integer]]
            for _, stack in ipairs(core:GetItems(source) or {}) do
                if stack.slot == slot then return qbStack(stack) end
            end
        end,
        HasItem = function(items, amount) return hasItem(source, items, amount) end,
        ClearInventory = function(keep)
            if keep == nil then
                core:ClearInventory(source)
            else
                local kept = {}
                for _, name in ipairs(type(keep) == 'table' and keep or { keep }) do kept[name] = true end
                for _, stack in ipairs(core:GetItems(source) or {}) do
                    if not kept[stack.name] then core:RemoveItem(source, stack.name, stack.count, nil, stack.slot) end
                end
            end
            itemsReadAt[source] = nil
        end,
        -- ai-core's inventory layer has no "replace the whole inventory" call: refused (see docs/compat/bridge.md).
        SetInventory = function() return false end,
        SetCreditCard = function(cardNumber)
            local stored2 = mirror.metadata[CHARINFO_KEY]
            local values = type(stored2) == 'table' and copy(stored2) or {}
            values.card = cardNumber
            core:SetMeta(source, CHARINFO_KEY, values)
        end,
        GetCardSlot = function(cardNumber, cardType)
            local name = tostring(cardType):lower()
            for _, stack in ipairs(core:GetItems(source) or {}) do
                if stack.name == name and type(stack.metadata) == 'table' and stack.metadata.cardNumber == cardNumber then return stack.slot end
            end
        end,
        GetName = function() return ('%s %s'):format(data.charinfo.firstname, data.charinfo.lastname) end,
        Notify = function(text, kind, length) Bridge.notify(source, text, kind, length) end,
        -- ai-core writes money and memberships as they change; this writes position and metadata now.
        Save = function()
            data.position = GetEntityCoords(GetPlayerPed(source))
            core:SavePlayer(source)
        end,
        Logout = function() Bridge.logout(source) end,
    }
    return functions
end
