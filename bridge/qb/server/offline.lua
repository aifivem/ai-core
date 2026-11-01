-- Players by citizenid, loaded or not (QBCore.Player.GetOfflinePlayer), detached Player objects for a script's own
-- PlayerData, and every holder of a job or gang.

local core = Bridge.core
local getPlayer, offlinePlayer, offlineCharacters = BridgeQB.getPlayer, BridgeQB.offlinePlayer, BridgeQB.offlineCharacters

--- A Player object for PlayerData of no stored character (a script's own `CreatePlayer`): reads work, changes stay on
--- this object, money and items answer false.
---@param data table QB PlayerData
---@return QBPlayer
local function detachedPlayer(data)
    local player = { PlayerData = data, Offline = true } --[[@as QBPlayer]]
    local function refuse() return false end
    local function nothing() end
    local functions = {
        GetPlayerData = function() return data end,
        UpdateClient = nothing,
        UpdatePlayerData = nothing,
        AddMoney = refuse,
        RemoveMoney = refuse,
        SetMoney = refuse,
        GetMoney = function(moneytype)
            if type(moneytype) ~= 'string' then return false end
            return data.money[moneytype:lower()]
        end,
        SetJob = refuse,
        SetGang = refuse,
        SetJobDuty = nothing,
        SetPlayerData = function(key, value)
            if type(key) == 'string' then data[key] = value end
        end,
        SetMetaData = function(key, value)
            if type(key) == 'string' then data.metadata[key] = value end
        end,
        GetMetaData = function(key)
            if type(key) == 'string' then return data.metadata[key] end
        end,
        AddRep = nothing,
        RemoveRep = nothing,
        GetRep = function(rep)
            if type(rep) ~= 'string' then return end
            return type(data.metadata.rep) == 'table' and data.metadata.rep[rep] or 0
        end,
        AddJobReputation = nothing,
        AddItem = refuse,
        RemoveItem = refuse,
        GetItemByName = nothing,
        GetItemsByName = function() return {} end,
        GetItemBySlot = nothing,
        HasItem = refuse,
        ClearInventory = nothing,
        SetInventory = refuse,
        SetCreditCard = function(cardNumber) data.charinfo.card = cardNumber end,
        GetCardSlot = nothing,
        GetName = function() return ('%s %s'):format(data.charinfo.firstname, data.charinfo.lastname) end,
        Notify = nothing,
        Save = nothing,
        Logout = nothing,
    }
    player.Functions = functions --[[@as QBPlayerFunctions]]
    BridgeQB.addExtensions(player, player.Functions)
    return player
end

--- A character by citizenid: the loaded Player, else an offline Player built from ai-core's `GetOfflineCharacter`
--- (ai-core's citizenid is the character's id). Waits: call from a thread.
---@param citizenid string|integer
---@return QBPlayer|nil
local function getOfflinePlayer(citizenid)
    if citizenid == nil then return nil end
    citizenid = tostring(citizenid)
    local online = BridgeQB.getPlayerByCitizenId(citizenid)
    if online then return online end
    local charId = Bridge.charIdOf(citizenid)
    if not charId then return nil end
    local character = Bridge.await('GetOfflineCharacter', charId)
    if type(character) ~= 'table' or tostring(character.info.citizenid) ~= citizenid then return nil end
    -- Loaded while ai-core read it: the live Player.
    local loaded = character.source and getPlayer(character.source)
    if loaded then return loaded end
    return offlinePlayer(character)
end

BridgeQB.getOfflinePlayer = getOfflinePlayer
--- The stored character an offline Player of `getOfflinePlayer` was built from.
---@param player table
---@return AiOfflineCharacter|nil
BridgeQB.offlineCharacter = function(player) return offlineCharacters[player] end
QBCore.Player.GetOfflinePlayer = getOfflinePlayer
QBCore.Functions.GetOfflinePlayerByCitizenId = getOfflinePlayer

--- Every holder of a job or gang, loaded or not (ai-core's paged members, 500 a page; QB's / Qbox's member lists).
--- Waits.
---@param kind 'job'|'gang'
---@param name string
---@return { citizenid: string, grade: integer, source: integer|nil }[]
local function groupMembers(kind, name)
    local out = {}
    if type(name) ~= 'string' then return out end
    local export = kind == 'gang' and 'GetGangMembers' or 'GetJobMembers'
    local after
    repeat
        local answer = promise.new()
        core[export](core, name, function(page) answer:resolve(page) end, after, 500)
        local page = Citizen.Await(answer)
        if type(page) ~= 'table' then break end
        for _, member in ipairs(page.members or {}) do
            out[#out + 1] = { citizenid = member.citizenid, grade = member.grade, source = member.source }
        end
        after = page.next
    until after == nil
    return out
end
BridgeQB.groupMembers = groupMembers
BridgeQB.detachedPlayer = detachedPlayer
