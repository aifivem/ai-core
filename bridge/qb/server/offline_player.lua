-- The QB Player object of a stored character that is not loaded: changes go through ai-core's offline character
-- exports.

local copy, CHARINFO_KEY, succeeded = BridgeQB.copy, BridgeQB.charinfoKey, BridgeQB.succeeded
local OWNED, offlineCharacters, offlineData = BridgeQB.offlineOwned, BridgeQB.offlineCharacters, BridgeQB.offlineData
local jobView, gangView = BridgeQB.jobView, BridgeQB.gangView

--- A Player object for a stored character that is not loaded: money, job, gang, metadata and charinfo changes are
--- written through ai-core's offline character exports (each waits for its answer: call from a thread); items are
--- refused (an inventory belongs to a loaded player).
---@param character AiOfflineCharacter
---@return QBPlayer
local function offlinePlayer(character)
    local charId = character.info.id
    local data = offlineData(character)
    local player = { PlayerData = data, Offline = true } --[[@as QBPlayer]]

    ---@param key string
    ---@param value any
    ---@return boolean
    local function setMeta(key, value)
        if not succeeded(Bridge.await('SetOfflineMeta', charId, key, value)) then return false end
        character.metadata[key] = value
        if key ~= CHARINFO_KEY then
            if value == nil then value = copy(BridgeQB.metaDefaults[key]) end
            data.metadata[key] = value
        end
        return true
    end

    ---@param name string
    ---@return table
    local function metaTable(name)
        local value = character.metadata[name]
        if type(value) == 'table' then return copy(value) end
        return copy(BridgeQB.metaDefaults[name]) or {}
    end

    ---@param kind 'Add'|'Remove'|'Set'
    ---@return fun(moneytype: string, amount: number, reason?: string): boolean
    local function money(kind)
        return function(moneytype, amount, reason)
            local value = tonumber(amount)
            if type(moneytype) ~= 'string' or not value then return false end
            local account = moneytype:lower()
            local balance = data.money[account]
            if balance == nil then return false end
            if not succeeded(Bridge.await(kind .. 'OfflineMoney', charId, account, value, reason)) then return false end
            data.money[account] = kind == 'Add' and balance + value or kind == 'Remove' and balance - value or value
            character.money[account] = data.money[account]
            return true
        end
    end

    local function refuse() return false end
    local function nothing() end
    local functions
    functions = {
        GetPlayerData = function() return data end,
        UpdateClient = nothing,
        UpdatePlayerData = nothing,
        AddMoney = money('Add'),
        RemoveMoney = money('Remove'),
        SetMoney = money('Set'),
        GetMoney = function(moneytype)
            if type(moneytype) ~= 'string' then return false end
            local amount = data.money[moneytype:lower()]
            return amount ~= nil and amount or false
        end,
        SetJob = function(job, grade)
            if type(job) ~= 'string' then return false end
            job, grade = job:lower(), math.tointeger(tonumber(grade)) or 0
            if not succeeded(Bridge.await('SetOfflineJob', charId, job, grade)) then return false end
            local held = false
            for _, m in ipairs(character.jobs) do
                if m.job == job then m.grade, held = grade, true end
            end
            if not held then character.jobs[#character.jobs + 1] = { job = job, grade = grade } end
            data.job = jobView({ job = job, grade = grade })
            return true
        end,
        -- Duty is runtime state of a loaded character.
        SetJobDuty = nothing,
        SetGang = function(gang, grade)
            if type(gang) ~= 'string' then return false end
            gang, grade = gang:lower(), math.tointeger(tonumber(grade)) or 0
            if not succeeded(Bridge.await('SetOfflineGang', charId, gang, grade)) then return false end
            local held = false
            for _, m in ipairs(character.gangs) do
                if m.gang == gang then m.grade, held = grade, true end
            end
            if not held then character.gangs[#character.gangs + 1] = { gang = gang, grade = grade } end
            character.activeGang = character.activeGang or gang
            data.gang = gangView({ { gang = gang, grade = grade } }, gang)
            return true
        end,
        SetMetaData = function(key, value)
            if type(key) ~= 'string' or key == CHARINFO_KEY then return end
            if (key == 'hunger' or key == 'thirst') and type(value) == 'number' then value = math.min(100, math.max(0, value)) end
            setMeta(key, value)
        end,
        GetMetaData = function(key)
            if type(key) ~= 'string' or key == CHARINFO_KEY then return end
            return data.metadata[key]
        end,
        AddRep = function(rep, amount)
            local add = tonumber(amount)
            if type(rep) ~= 'string' or not add then return end
            local reps = metaTable('rep')
            reps[rep] = (tonumber(reps[rep]) or 0) + add
            setMeta('rep', reps)
        end,
        RemoveRep = function(rep, amount)
            local remove = tonumber(amount)
            if type(rep) ~= 'string' or not remove then return end
            local reps = metaTable('rep')
            reps[rep] = math.max(0, (tonumber(reps[rep]) or 0) - remove)
            setMeta('rep', reps)
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
            setMeta('jobrep', reps)
        end,
        AddItem = refuse,
        RemoveItem = refuse,
        GetItemByName = nothing,
        GetItemsByName = function() return {} end,
        GetItemBySlot = nothing,
        HasItem = refuse,
        ClearInventory = nothing,
        SetInventory = refuse,
        SetCreditCard = function(cardNumber)
            local values = metaTable(CHARINFO_KEY)
            values.card = cardNumber
            if setMeta(CHARINFO_KEY, values) then data.charinfo.card = cardNumber end
        end,
        GetCardSlot = nothing,
        GetName = function() return ('%s %s'):format(data.charinfo.firstname, data.charinfo.lastname) end,
        Notify = nothing,
        -- Every change above is written as it happens.
        Save = nothing,
        Logout = nothing,
    }
    functions.SetPlayerData = function(key, value)
        if type(key) ~= 'string' or OWNED[key] then return end
        if key == 'metadata' then
            if type(value) ~= 'table' then return end
            for k, v in pairs(value) do
                if type(k) == 'string' and k ~= CHARINFO_KEY and (type(v) == 'table' or character.metadata[k] ~= v) then setMeta(k, v) end
            end
        elseif key == 'job' then
            if type(value) == 'table' and type(value.name) == 'string' then functions.SetJob(value.name, type(value.grade) == 'table' and value.grade.level or 0) end
        elseif key == 'gang' then
            if type(value) == 'table' and type(value.name) == 'string' then functions.SetGang(value.name, type(value.grade) == 'table' and value.grade.level or 0) end
        elseif key == 'charinfo' then
            if type(value) ~= 'table' then return end
            local patch = BridgeQB.charinfoPatch(value, data.charinfo, false)
            if patch and succeeded(Bridge.await('SetCharacterInfo', charId, patch)) then
                BridgeQB.applyCharinfo(data.charinfo, patch)
                data.name = ('%s %s'):format(data.charinfo.firstname, data.charinfo.lastname)
            end
            local values, changed = metaTable(CHARINFO_KEY), false
            for _, field in ipairs({ 'account', 'card' }) do
                if value[field] ~= nil and value[field] ~= values[field] then values[field], changed = value[field], true end
            end
            if changed and setMeta(CHARINFO_KEY, values) then
                data.charinfo.account, data.charinfo.card = values.account or data.charinfo.account, values.card
            end
        else
            -- Fields ai-core has no column for stay on this object.
            data[key] = value
        end
    end
    player.Functions = functions --[[@as QBPlayerFunctions]]
    BridgeQB.addExtensions(player, player.Functions)
    offlineCharacters[player] = character
    return player
end

BridgeQB.offlinePlayer = offlinePlayer
