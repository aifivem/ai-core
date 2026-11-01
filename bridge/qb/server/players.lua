-- QBCore.Functions player lookups (by source, identifier, phone, account, charinfo, job) and AddPlayerMethod /
-- AddPlayerField.

local getPlayer, getPlayerByCitizenId = BridgeQB.getPlayer, BridgeQB.getPlayerByCitizenId
local qbPlayers, byLicense = BridgeQB.players, BridgeQB.byLicense

QBCore.Functions.GetPlayer = function(source)
    if tonumber(source) then return getPlayer(source) end
    local src = QBCore.Functions.GetSource(source)
    return src ~= 0 and getPlayer(src) or nil
end
QBCore.Functions.GetPlayerByCitizenId = getPlayerByCitizenId

---@return integer[]
function QBCore.Functions.GetPlayers()
    local out = {}
    for source in pairs(Bridge.players) do out[#out + 1] = source end
    return out
end

---@return table<integer, QBPlayer>
function QBCore.Functions.GetQBPlayers()
    return qbPlayers
end

---@param source integer
---@param idtype? string
function QBCore.Functions.GetIdentifier(source, idtype)
    return GetPlayerIdentifierByType(tostring(source), idtype or 'license')
end

--- The server id of a loaded player by any of their identifiers (`license:...`, `discord:...`); 0 when none.
---@param identifier string
---@return integer
function QBCore.Functions.GetSource(identifier)
    if type(identifier) ~= 'string' then return 0 end
    local source = byLicense[identifier]
    if source then return source end
    if identifier:sub(1, 8) == 'license:' then return 0 end
    for src in pairs(Bridge.players) do
        for _, id in ipairs(GetPlayerIdentifiers(tostring(src))) do
            if id == identifier then return src end
        end
    end
    return 0
end

function QBCore.Functions.Notify(source, text, kind, length)
    Bridge.notify(source, text, kind, length)
end

--- A Player by phone number: the running phone script's owner of that number (ai-core's phone layer), else the number
--- the bridge gave the character while no phone script answers.
---@param number string|integer
---@return QBPlayer|nil
function QBCore.Functions.GetPlayerByPhone(number)
    if number == nil then return nil end
    local source = aiLib.phone.sourceOf(tostring(number)) or BridgeQB.sourceByPhone(tostring(number))
    return source and getPlayer(source) or nil
end

---@param account string
---@return QBPlayer|nil
function QBCore.Functions.GetPlayerByAccount(account)
    local source = BridgeQB.sourceByAccount(account)
    return source and getPlayer(source) or nil
end

--- A loaded Player whose `charinfo[property]` equals `value` (walks the loaded players, like qb-core).
---@param property string
---@param value any
---@return QBPlayer|nil
function QBCore.Functions.GetPlayerByCharInfo(property, value)
    for source, player in pairs(QBCore.Players) do
        local charinfo = player.PlayerData.charinfo
        if charinfo[property] ~= nil and charinfo[property] == value then return getPlayer(source) end
    end
    return nil
end

--- Players of a job (name or job type), optionally only those on duty: on-duty sets come from the mirror's index.
---@param job string
---@param checkOnDuty? boolean
---@return integer[], integer
function QBCore.Functions.GetPlayersByJob(job, checkOnDuty)
    local players = {}
    local definitions = Bridge.jobDefinitions()
    if checkOnDuty then
        for source in pairs(Bridge.onDutyIn(job)) do players[#players + 1] = source end
        for name, definition in pairs(definitions) do
            if name ~= job and definition.type == job then
                for source in pairs(Bridge.onDutyIn(name)) do players[#players + 1] = source end
            end
        end
    else
        for source, mirror in pairs(Bridge.players) do
            local name = mirror.job.job
            if name == job or (definitions[name] and definitions[name].type == job) then players[#players + 1] = source end
        end
    end
    return players, #players
end

---@param job string
---@return integer[], integer
function QBCore.Functions.GetPlayersOnDuty(job)
    return QBCore.Functions.GetPlayersByJob(job, true)
end

---@param job string
---@return integer
function QBCore.Functions.GetDutyCount(job)
    local _, count = QBCore.Functions.GetPlayersByJob(job, true)
    return count
end

---@param ids integer|integer[]
---@param fn fun(player: QBPlayer)
local function forEachPlayer(ids, fn)
    if type(ids) == 'number' then
        if ids == -1 then
            for _, player in pairs(QBCore.Players) do fn(player) end
        elseif QBCore.Players[ids] then
            fn(QBCore.Players[ids])
        end
    elseif type(ids) == 'table' then
        for i = 1, #ids do forEachPlayer(ids[i], fn) end
    end
end

---@param ids integer|integer[] a source, a list of them or -1 (every loaded player)
---@param methodName string
---@param handler function
function QBCore.Functions.AddPlayerMethod(ids, methodName, handler)
    forEachPlayer(ids, function(player) player.Functions.AddMethod(methodName, handler) end)
end

---@param ids integer|integer[]
---@param fieldName string
---@param data any
function QBCore.Functions.AddPlayerField(ids, fieldName, data)
    forEachPlayer(ids, function(player) player.Functions.AddField(fieldName, data) end)
end
