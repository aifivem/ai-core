-- Resolving players the way qbx_core does: server ids, identifiers and citizenids, loaded or stored (offline Player
-- objects of the QB bridge with Qbox's fields), and the membership maps and errors the exports answer with.

local byIdentifier = BridgeQbox.byIdentifier

--- qbx_core's resolvePlayer: a string is a citizenid, a number a server id (loaded characters only).
---@param identifier integer|string
---@return integer|nil
local function resolveSource(identifier)
    if type(identifier) == 'string' then return Bridge.sourceByCitizenId(identifier) end
    local source = math.tointeger(identifier)
    return source and Bridge.players[source] and source or nil
end

--- A player by server id, FiveM identifier ('license:...') or, beyond Qbox, citizenid.
---@param identifier integer|string
---@return integer source 0 when nobody matches (Qbox's GetSource)
local function sourceOfIdentifier(identifier)
    if type(identifier) ~= 'string' then return 0 end
    return byIdentifier[identifier] or Bridge.sourceByCitizenId(identifier) or 0
end

---@param citizenid string
---@return false, QboxErrorResult
local function playerNotFound(citizenid)
    return false, { code = 'player_not_found', message = ('player not found with citizenid %s'):format(tostring(citizenid)) }
end

---@param code string
---@param name string
---@return false, QboxErrorResult
local function groupNotFound(code, name)
    return false, { code = code, message = ('%s does not exist in core memory'):format(tostring(name)) }
end

---@param mirror BridgeMirror
---@return table<string, integer>
local function jobMap(mirror)
    local out = {}
    for _, m in ipairs(mirror.jobs) do out[m.job] = m.grade end
    return out
end

---@param mirror BridgeMirror
---@return table<string, integer>
local function gangMap(mirror)
    local out = {}
    for _, m in ipairs(mirror.gangs) do out[m.gang] = m.grade end
    return out
end

--- Qbox money amounts: finite, rounded, not negative.
---@param value any
---@return integer|nil
local function moneyAmount(value)
    value = tonumber(value)
    if not value or value ~= value or value == math.huge or value == -math.huge then return nil end
    local rounded = aiLib.numbers.round(value)
    if rounded < 0 then return nil end
    return math.tointeger(rounded)
end

-- Offline characters: the QB bridge's offline Player (ai-core reads and writes a stored character) plus Qbox's fields.

---@param player table|nil
---@return table|nil
local function qboxOffline(player)
    if not player or not player.Offline then return player end
    local data = player.PlayerData
    local character = BridgeQB.offlineCharacter(player)
    data.jobs, data.gangs = {}, {}
    if character then
        data.userId = character.info.userId
        for _, m in ipairs(character.jobs) do data.jobs[m.job] = m.grade end
        for _, m in ipairs(character.gangs) do data.gangs[m.gang] = m.grade end
    end
    data.job.bankAuth = data.job.isboss == true
    data.gang.bankAuth = data.gang.isboss == true
    BridgeQbox.fillMeta(data.metadata)
    return player
end

--- A stored character by citizenid, loaded or not (waits for ai-core's read when not loaded).
---@param citizenid string
---@return table|nil
local function getOfflinePlayer(citizenid)
    if type(citizenid) ~= 'string' and type(citizenid) ~= 'number' then return nil end
    return qboxOffline(BridgeQB.getOfflinePlayer(tostring(citizenid)))
end

--- Qbox's resolvePlayer: a loaded character's source, else (a citizenid) the stored character as an offline Player
--- (waits). Both nil when nobody matches.
---@param identifier integer|string
---@return integer|nil source, table|nil offline
local function resolve(identifier)
    local source = resolveSource(identifier)
    if source or type(identifier) ~= 'string' then return source, nil end
    local player = getOfflinePlayer(identifier)
    if player and not player.Offline then return player.PlayerData.source, nil end
    return nil, player
end

BridgeQbox.resolveSource = resolveSource
BridgeQbox.sourceOfIdentifier = sourceOfIdentifier
BridgeQbox.playerNotFound = playerNotFound
BridgeQbox.groupNotFound = groupNotFound
BridgeQbox.jobMap = jobMap
BridgeQbox.gangMap = gangMap
BridgeQbox.moneyAmount = moneyAmount
BridgeQbox.qboxOffline = qboxOffline
BridgeQbox.getOfflinePlayer = getOfflinePlayer
BridgeQbox.resolve = resolve
