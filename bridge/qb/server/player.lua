-- The QB Player object of a loaded character: built once when the character loads, kept current by the mirror's
-- changes (bridge/qb/server/events.lua), with O(1) lookups by citizenid, phone, account and license. Its
-- `Functions` table: bridge/qb/server/player_functions.lua.

local core = Bridge.core
local qbJob, qbGang = BridgeShapes.qbJob, BridgeShapes.qbGang
local copy, metadataOf, CHARINFO_KEY, charinfoPatch = BridgeQB.copy, BridgeQB.metadataOf, BridgeQB.charinfoKey, BridgeQB.charinfoPatch
local itemsReadAt, ITEMS_TTL, itemsOf = BridgeQB.itemsReadAt, BridgeQB.itemsTtl, BridgeQB.itemsOf
local addExtensions = BridgeQB.addExtensions

---@type table<integer, QBPlayer>
local qbPlayers = {}
---@type table<string, QBPlayer> citizenid -> Player (QB's `QBCore.PlayersByCitizenId`)
local byCitizenPlayer = {}
---@type table<string, integer> charinfo.phone -> source
local byPhone = {}
---@type table<string, integer> charinfo.account -> source
local byAccount = {}
---@type table<string, integer> license identifier -> source of the loaded players
local byLicense = {}

--- QBCore's server-side "player data changed" event (`UpdateClient` in qb-core; the client follows ai-core's own
--- player data channel, so only the server event fires here).
---@param source integer
---@param key string
---@param value any
local function playerUpdated(source, key, value)
    TriggerEvent('QBCore:Server:OnPlayerUpdated', source, key, value)
end

--- The values ai-core owns: `SetPlayerData` never replaces them.
local OWNED = { source = true, citizenid = true, cid = true, license = true, name = true, money = true, items = true }

---@param source integer
---@return QBPlayer|nil
local function build(source)
    local mirror = Bridge.players[source]
    if not mirror then return nil end
    local c = mirror.character
    -- QB-only charinfo values, made once per character and kept in ai-core's metadata.
    local stored = mirror.metadata[CHARINFO_KEY]
    local extra = type(stored) == 'table' and copy(stored) or {}
    local changed = false
    if not extra.account then extra.account, changed = QBCore.Functions.CreateAccountNumber(), true end
    local phone = aiLib.phone.number(source)
    if not phone then
        if not extra.phone then extra.phone, changed = QBCore.Functions.CreatePhoneNumber(), true end
        phone = extra.phone
    end
    if changed then core:SetMeta(source, CHARINFO_KEY, extra) end
    local metadata = metadataOf(mirror)
    -- QB's per-character ids (fingerprint, wallet, blood type, phone serial) are made once and kept.
    for key, generate in pairs(BridgeQB.generatedMeta) do
        if mirror.metadata[key] == nil then
            local value = generate()
            metadata[key] = value
            core:SetMeta(source, key, value)
        end
    end
    local previous = qbPlayers[source]
    ---@type QBPlayerData
    local data = {
        source = source,
        citizenid = c.citizenid,
        cid = c.slot,
        license = Bridge.license(source),
        name = GetPlayerName(tostring(source)),
        money = mirror.money,
        charinfo = {
            firstname = c.firstname, lastname = c.lastname, birthdate = c.birthdate, gender = c.sex == 'female' and 1 or 0,
            nationality = c.nationality or '', phone = tostring(phone), account = extra.account, card = extra.card,
        },
        job = qbJob(Bridge.jobOf(mirror)),
        gang = qbGang(Bridge.gangOf(mirror)),
        metadata = metadata,
        position = GetEntityCoords(GetPlayerPed(source)),
        items = itemsOf(source),
        optin = mirror.metadata.optin ~= false,
    }
    local player = { PlayerData = data, Offline = false } --[[@as QBPlayer]]
    local functions = BridgeQB.playerFunctions(source, mirror, data)
    functions.UpdatePlayerData = functions.UpdateClient
    functions.SetPlayerData = function(key, value)
        if type(key) ~= 'string' or OWNED[key] then return end
        if key == 'metadata' then
            if type(value) ~= 'table' then return end
            for k, v in pairs(value) do
                if type(k) == 'string' and k ~= CHARINFO_KEY and (type(v) == 'table' or mirror.metadata[k] ~= v) then core:SetMeta(source, k, v) end
            end
        elseif key == 'job' then
            if type(value) == 'table' and type(value.name) == 'string' then
                functions.SetJob(value.name, type(value.grade) == 'table' and value.grade.level or 0)
                if value.onduty ~= nil then functions.SetJobDuty(value.onduty) end
            end
        elseif key == 'gang' then
            if type(value) == 'table' and type(value.name) == 'string' then functions.SetGang(value.name, type(value.grade) == 'table' and value.grade.level or 0) end
        elseif key == 'charinfo' then
            -- Names, birth date and nationality go to ai-core's character; the QB-only values are kept in metadata.
            if type(value) ~= 'table' then return end
            local patch = charinfoPatch(value, data.charinfo, true)
            if patch then
                core:SetCharacterInfo(c.id, patch, function(result)
                    if type(result) == 'table' and result.ok then Bridge.characterChanged(source, patch) end
                end)
            end
            local stored2 = mirror.metadata[CHARINFO_KEY]
            local values = type(stored2) == 'table' and copy(stored2) or {}
            local extraChanged = false
            for _, field in ipairs({ 'account', 'card' }) do
                if value[field] ~= nil and value[field] ~= values[field] then values[field], extraChanged = value[field], true end
            end
            if extraChanged then core:SetMeta(source, CHARINFO_KEY, values) end
        else
            data[key] = value
            playerUpdated(source, key, value)
        end
    end
    player.Functions = functions --[[@as QBPlayerFunctions]]
    addExtensions(player, player.Functions)
    -- Fields and methods other scripts added to the previous Player object of this source stay.
    if previous then
        for name, value in pairs(previous) do
            if name ~= 'PlayerData' and name ~= 'Functions' and name ~= 'Offline' then player[name] = value end
        end
        for name, fn in pairs(previous.Functions) do
            if functions[name] == nil then functions[name] = fn end
        end
    end
    if previous then
        byPhone[previous.PlayerData.charinfo.phone] = nil
        byAccount[previous.PlayerData.charinfo.account] = nil
    end
    byPhone[data.charinfo.phone] = source
    byAccount[data.charinfo.account] = source
    if data.license then byLicense[data.license] = source end
    byCitizenPlayer[data.citizenid] = player
    qbPlayers[source] = player
    return player
end

--- The Player object, built once when the character loads and kept current by the mirror's changes; its item list is
--- read again when older than a second.
---@param source integer
---@return QBPlayer|nil
local function getPlayer(source)
    source = tonumber(source) --[[@as integer]]
    if not source or not Bridge.players[source] then return nil end
    local player = qbPlayers[source] or build(source)
    if player and GetGameTimer() - (itemsReadAt[source] or -ITEMS_TTL) >= ITEMS_TTL then player.PlayerData.items = itemsOf(source) end
    return player
end

---@param citizenid string
---@return QBPlayer|nil
local function getPlayerByCitizenId(citizenid)
    local source = Bridge.sourceByCitizenId(citizenid)
    return source and getPlayer(source) or nil
end

BridgeQB.players = qbPlayers
BridgeQB.byCitizenId = byCitizenPlayer
BridgeQB.byPhone = byPhone
BridgeQB.byAccount = byAccount
BridgeQB.byLicense = byLicense
BridgeQB.playerUpdated = playerUpdated
BridgeQB.build = build
BridgeQB.getPlayer = getPlayer
BridgeQB.getPlayerByCitizenId = getPlayerByCitizenId
BridgeQB.qbJob = qbJob

---@param phone string
---@return integer|nil
function BridgeQB.sourceByPhone(phone) return byPhone[tostring(phone)] end
---@param account string
---@return integer|nil
function BridgeQB.sourceByAccount(account) return byAccount[account] end

--- Replaced by bridge/qb/server/offline.lua: a stored character as an offline QB Player (waits; call from a thread).
---@type fun(citizenid: string): QBPlayer|nil
BridgeQB.getOfflinePlayer = getPlayerByCitizenId
