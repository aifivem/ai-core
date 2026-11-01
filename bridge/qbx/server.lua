-- Qbox on ai-core, server side: the `exports.qbx_core:*` player, group, money and metadata functions and qbx_core's
-- server events. Player objects are the QB ones (bridge/qb/server.lua) with Qbox's extra PlayerData (`userId`, `jobs`,
-- `gangs`, `bankAuth`, Qbox metadata defaults) and player functions added at load; everything reads the shared mirror
-- (bridge/core/server.lua) and writes through ai-core. World helpers (buckets, vehicles, permissions): server_world.lua.

local core = Bridge.core

local function provide(name, fn) Bridge.provideExport('qbx_core', name, fn) end

-- Indexes of the loaded players (filled at load, cleared at unload; every lookup is O(1)).

---@type table<string, integer> FiveM identifier ('license:...', 'discord:...') -> source
local byIdentifier = {}
---@type table<integer, string[]> source -> its identifiers (to clear `byIdentifier`)
local identifiersOf = {}
---@type table<integer, integer> account id -> source
local byUserId = {}
---@type table<integer, integer> source -> account id
local userIds = {}
--- The last metadata value each key had (qbx_core's onSetMetaData hands the old value; ai-core's `metaChanged` only the
--- new one).
---@type table<integer, table<string, any>>
local metaBefore = {}

-- Qbox job / gang definitions, built from ai-core's panel definitions and dropped when the panel changes one.

---@type { jobs: table<string, QboxJob>|nil, gangs: table<string, QboxGang>|nil }
local definitions = {}

---@return table<string, QboxJob>
local function qboxJobs()
    definitions.jobs = definitions.jobs or BridgeQbox.jobs(Bridge.jobDefinitions())
    return definitions.jobs
end

---@return table<string, QboxGang>
local function qboxGangs()
    definitions.gangs = definitions.gangs or BridgeQbox.gangs(Bridge.gangDefinitions())
    return definitions.gangs
end

-- A panel edit of a job or gang is qbx_core's CreateJob / UpsertJobData etc.: the same events, nil when deleted.
AddEventHandler('ai-core:definitionsChanged', function(file, name)
    if file == 'jobs' then
        definitions.jobs = nil
        TriggerEvent('qbx_core:server:onJobUpdate', name, qboxJobs()[name])
    elseif file == 'gangs' then
        definitions.gangs = nil
        TriggerEvent('qbx_core:server:onGangUpdate', name, qboxGangs()[name])
    end
end)

-- Event hooks (qbx_core's modules/hooks.lua): `registerHook(event, cb)`, a callback returning false cancels. ai-core
-- runs the hook points qbx_core has: `addMoney`, `removeMoney`, `setMoney`.

---@class QboxHook
---@field fn function
---@field resource string
---@field id integer

---@type table<string, QboxHook[]>
local hooks = {}
local hookId = 0

provide('registerHook', function(event, cb)
    if type(event) ~= 'string' or cb == nil then return 0 end
    hookId = hookId + 1
    local list = hooks[event]
    if not list then list = {} hooks[event] = list end
    list[#list + 1] = { fn = cb, resource = GetInvokingResource() or 'ai-core', id = hookId }
    return hookId
end)

---@param resource string
---@param id? integer
local function removeHooks(resource, id)
    for _, list in pairs(hooks) do
        for i = #list, 1, -1 do
            if list[i].resource == resource and (not id or list[i].id == id) then table.remove(list, i) end
        end
    end
end

provide('removeHooks', function(id) removeHooks(GetInvokingResource() or 'ai-core', tonumber(id)) end)
AddEventHandler('onResourceStop', function(resource) removeHooks(resource) end)

--- Runs the hooks of an event; false when one cancels it.
---@param event string
---@param payload table
---@return boolean
local function runHooks(event, payload)
    local list = hooks[event]
    if not list then return true end
    for i = 1, #list do
        local ok, answer = pcall(list[i].fn, payload)
        if not ok then print(('^1[ai-core bridge] qbx_core hook %s of %s failed: %s^0'):format(event, list[i].resource, answer)) end
        if answer == false then return false end
    end
    return true
end

-- Resolving players the way qbx_core does.

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
    return false, { code = 'player_not_found', message = ('player not found with citizenid %s (ai-core changes loaded characters only)'):format(tostring(citizenid)) }
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

-- Offline characters: the QB bridge's offline Player (ai-core reads a stored character by id) plus Qbox's fields.

---@param player table|nil
---@return table|nil
local function qboxOffline(player)
    if not player or not player.Offline then return player end
    local data = player.PlayerData
    data.jobs, data.gangs = data.jobs or {}, data.gangs or {}
    data.job.bankAuth, data.gang.bankAuth = false, false
    return player
end

--- A stored character by citizenid, loaded or not (waits for ai-core's read when not loaded).
---@param citizenid string
---@return table|nil
local function getOfflinePlayer(citizenid)
    if type(citizenid) ~= 'string' and type(citizenid) ~= 'number' then return nil end
    return qboxOffline(BridgeQB.getOfflinePlayer(tostring(citizenid)))
end

-- The Qbox parts of a loaded player's object.

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

local setPlayerData

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
    add('SetPlayerData', function(key, value) setPlayerData(source, key, value) end)
    add('GetName', function() return ('%s %s'):format(data.charinfo.firstname, data.charinfo.lastname) end)
    add('Logout', function() core:SwitchCharacter(source) end)
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

--- Player state bags Qbox scripts read (`LocalPlayer.state.isLoggedIn`, `hunger` / `thirst` / `stress`), set by the
--- server only (sv_stateBagStrictMode).
local NEEDS = { hunger = true, thirst = true, stress = true }

Bridge.on('loaded', function(source)
    local mirror = Bridge.players[source]
    local name = tostring(source)
    local list = {}
    for i = 0, GetNumPlayerIdentifiers(name) - 1 do
        local identifier = GetPlayerIdentifier(name, i)
        if identifier then
            list[#list + 1] = identifier
            byIdentifier[identifier] = source
        end
    end
    identifiersOf[source] = list
    local userId = core:GetUserId(source)
    if userId then
        userIds[source], byUserId[userId] = userId, source
    end
    local before = {}
    for key, value in pairs(mirror.metadata) do before[key] = value end
    metaBefore[source] = before
    extendPlayer(source)
    local player = BridgeQB.getPlayer(source)
    local metadata = player and player.PlayerData.metadata or mirror.metadata
    local state = Player(source).state
    for key in pairs(NEEDS) do
        local value = tonumber(metadata[key])
        if value then state:set(key, value, true) end
    end
    state:set('isLoggedIn', true, true)
end)

Bridge.on('unloaded', function(source, reason)
    for _, identifier in ipairs(identifiersOf[source] or {}) do
        if byIdentifier[identifier] == source then byIdentifier[identifier] = nil end
    end
    identifiersOf[source] = nil
    local userId = userIds[source]
    if userId and byUserId[userId] == source then byUserId[userId] = nil end
    userIds[source], metaBefore[source] = nil, nil
    if reason == 'switch' then
        Player(source).state:set('isLoggedIn', false, true)
        -- After the bridge dropped the player, as qbx_core's Logout does.
        SetTimeout(0, function() TriggerEvent('qbx_core:server:playerLoggedOut', source) end)
    end
end)

--- Membership changes as qbx_core's onGroupUpdate (name, grade; no grade = removed).
---@param source integer
---@param before table<string, integer>
---@param after table<string, integer>
local function groupUpdates(source, before, after)
    for name, grade in pairs(after) do
        if before[name] ~= grade then TriggerEvent('qbx_core:server:onGroupUpdate', source, name, grade) end
    end
    for name in pairs(before) do
        if after[name] == nil then TriggerEvent('qbx_core:server:onGroupUpdate', source, name) end
    end
end

Bridge.on('job', function(source)
    local player, mirror = BridgeQB.getPlayer(source), Bridge.players[source]
    if not player or not mirror then return end
    local data = player.PlayerData --[[@as table]]
    data.job.bankAuth = data.job.isboss == true
    local after = jobMap(mirror)
    groupUpdates(source, data.jobs or {}, after)
    data.jobs = after
end)

Bridge.on('gang', function(source)
    local player, mirror = BridgeQB.getPlayer(source), Bridge.players[source]
    if not player or not mirror then return end
    local data = player.PlayerData --[[@as table]]
    data.gang.bankAuth = data.gang.isboss == true
    local after = gangMap(mirror)
    groupUpdates(source, data.gangs or {}, after)
    data.gangs = after
end)

Bridge.on('meta', function(source, key, value)
    local before = metaBefore[source]
    if not before then return end
    local old = before[key]
    before[key] = value
    local player = BridgeQB.getPlayer(source)
    if player and value == nil then
        local default = BridgeQbox.metaDefaults()[key]
        if default ~= nil then player.PlayerData.metadata[key] = default end
    end
    local state = Player(source).state
    if NEEDS[key] and tonumber(value) and state[key] ~= value then state:set(key, tonumber(value), true) end
    if key == 'isdead' or key == 'inlaststand' then state:set('canUseWeapons', not value, true) end
    TriggerEvent('qbx_core:server:onSetMetaData', key, old, value, source)
end)

-- Players.

provide('GetPlayer', function(identifier)
    local source = math.tointeger(tonumber(identifier))
    if not source then source = sourceOfIdentifier(identifier) end
    return BridgeQB.getPlayer(source)
end)
provide('GetPlayerByCitizenId', BridgeQB.getPlayerByCitizenId)
provide('GetOfflinePlayer', getOfflinePlayer)
provide('GetPlayerByUserId', function(userId)
    local source = byUserId[math.tointeger(tonumber(userId)) or -1]
    return source and BridgeQB.getPlayer(source) or nil
end)
provide('GetPlayerByPhone', function(number)
    local source = number ~= nil and aiLib.phone.sourceOf(tostring(number)) or nil
    return source and BridgeQB.getPlayer(source) or nil
end)
provide('GetSource', sourceOfIdentifier)
provide('GetUserId', function(identifier) return userIds[sourceOfIdentifier(identifier)] or 0 end)
provide('GetQBPlayers', function() return QBCore.Functions.GetQBPlayers() end)
provide('GetPlayersData', function()
    local out = {}
    for source in pairs(Bridge.players) do
        local player = BridgeQB.getPlayer(source)
        if player then out[#out + 1] = player.PlayerData end
    end
    return out
end)
provide('IsPlayerLoaded', function(source) return Bridge.players[source] ~= nil end)
provide('Login', function()
    print('^3[ai-core bridge] exports.qbx_core:Login is not supported: ai-core\'s character screen logs players in^0')
    return false
end)
provide('Logout', function(source)
    if Bridge.players[source] then core:SwitchCharacter(source) end
end)
provide('Save', function() end)
provide('SaveOffline', function() end)
provide('CreatePlayer', function(playerData, offline)
    if type(playerData) ~= 'table' then return nil end
    return qboxOffline(QBCore.Player.CreatePlayer(playerData, offline))
end)
provide('DeleteCharacter', function(citizenid)
    print(('^3[ai-core bridge] exports.qbx_core:DeleteCharacter(%s) is not supported: delete characters in the admin panel^0'):format(tostring(citizenid)))
end)

--- Qbox's SetPlayerData: `metadata` goes to ai-core key by key; other fields stay on the player object for the session.
---@param identifier integer|string
---@param key string
---@param value any
setPlayerData = function(identifier, key, value)
    if type(key) ~= 'string' then return end
    local source = resolveSource(identifier)
    local player = source and BridgeQB.getPlayer(source)
    if not source or not player then return end
    if key == 'metadata' and type(value) == 'table' then
        local current = Bridge.players[source].metadata
        for metaKey, metaValue in pairs(value) do
            if current[metaKey] ~= metaValue then core:SetMeta(source, metaKey, metaValue) end
        end
        return
    end
    player.PlayerData[key] = value
    ---@diagnostic disable-next-line: fivem/event-wrong-side
    TriggerEvent('QBCore:Player:SetPlayerData', player.PlayerData)
end
provide('SetPlayerData', setPlayerData)
provide('UpdatePlayerData', function(identifier)
    local source = resolveSource(identifier)
    local player = source and BridgeQB.getPlayer(source)
    if not player then return end
    ---@diagnostic disable-next-line: fivem/event-wrong-side
    TriggerEvent('QBCore:Player:SetPlayerData', player.PlayerData)
end)
provide('SetCharInfo', function(identifier, key, value)
    if type(key) ~= 'string' then return end
    local source = resolveSource(identifier)
    local player = source and BridgeQB.getPlayer(source)
    if not player then return end
    player.PlayerData.charinfo[key] = value
    ---@diagnostic disable-next-line: fivem/event-wrong-side
    TriggerEvent('QBCore:Player:SetPlayerData', player.PlayerData)
end)

-- Metadata.

local CLAMPED = { hunger = true, thirst = true, stress = true }

provide('SetMetadata', function(identifier, key, value)
    if type(key) ~= 'string' then return end
    local source = resolveSource(identifier)
    if not source then return end
    if CLAMPED[key] then
        value = tonumber(value)
        if not value or value ~= value or value == math.huge or value == -math.huge then return end
        value = math.max(0, math.min(100, value))
    end
    local top, nested = key:match('^([^%.]+)%.(.+)$')
    if not top then
        core:SetMeta(source, key, value)
        return
    end
    if nested:find('.', 1, true) then return end
    local current = Bridge.players[source].metadata[top]
    if type(current) ~= 'table' then return end
    local copy = {}
    for k, v in pairs(current) do copy[k] = v end
    copy[nested] = value
    core:SetMeta(source, top, copy)
end)

provide('GetMetadata', function(identifier, key)
    if type(key) ~= 'string' then return nil end
    local source = resolveSource(identifier)
    local player = source and BridgeQB.getPlayer(source)
    if not player then return nil end
    local metadata = player.PlayerData.metadata
    local top, nested = key:match('^([^%.]+)%.(.+)$')
    if not top then return metadata[key] end
    if nested:find('.', 1, true) or type(metadata[top]) ~= 'table' then return nil end
    return metadata[top][nested]
end)

-- Money (loaded characters; ai-core keeps offline balances in its own book, not changed from here).

---@param event 'addMoney'|'removeMoney'|'setMoney'
---@param change fun(source: integer, moneyType: string, amount: integer, reason: string): boolean
---@return fun(identifier: integer|string, moneyType: string, amount: number, reason?: string): boolean
local function moneyExport(event, change)
    return function(identifier, moneyType, amount, reason)
        local source = resolveSource(identifier)
        if not source then return false end
        local valid = moneyAmount(amount)
        if not valid or Bridge.players[source].money[moneyType] == nil then return false end
        if not runHooks(event, { source = source, moneyType = moneyType, amount = valid }) then return false end
        return change(source, moneyType, valid, reason or 'unknown') == true
    end
end

provide('AddMoney', moneyExport('addMoney', function(source, t, amount, reason) return core:AddMoney(source, t, amount, reason) end))
provide('RemoveMoney', moneyExport('removeMoney', function(source, t, amount, reason) return core:RemoveMoney(source, t, amount, reason) end))
provide('SetMoney', moneyExport('setMoney', function(source, t, amount, reason) return core:SetMoney(source, t, amount, reason) end))
provide('GetMoney', function(identifier, moneyType)
    if not moneyType then return false end
    local source = resolveSource(identifier)
    if not source then return false end
    local amount = Bridge.players[source].money[moneyType]
    if amount == nil then return false end
    return amount
end)

-- Groups.

provide('GetJobs', qboxJobs)
provide('GetGangs', qboxGangs)
provide('GetJob', function(name) return qboxJobs()[name] end)
provide('GetGang', function(name) return qboxGangs()[name] end)
provide('IsGradeBoss', function(group, grade)
    local definition = qboxJobs()[group] or qboxGangs()[group]
    if not definition then return nil end
    local entry = definition.grades[math.tointeger(tonumber(grade)) or -1]
    return entry ~= nil and entry.isboss == true
end)

---@param name string
---@return false, string
local function panelOnly(name)
    return false, ('%s is not supported on ai-core: jobs and gangs are edited in the admin panel'):format(name)
end

for _, name in ipairs({ 'CreateJob', 'CreateJobs', 'CreateGangs', 'RemoveJob', 'RemoveGang' }) do
    provide(name, function() return panelOnly(name) end)
end
for _, name in ipairs({ 'UpsertJobData', 'UpsertGangData', 'UpsertJobGrade', 'UpsertGangGrade', 'RemoveJobGrade', 'RemoveGangGrade' }) do
    provide(name, function()
        print(('^3[ai-core bridge] exports.qbx_core:%s is not supported: jobs and gangs are edited in the admin panel^0'):format(name))
    end)
end

---@param citizenid string|integer
---@param jobName string
---@param grade? integer
---@return boolean, QboxErrorResult?
local function addPlayerToJob(citizenid, jobName, grade)
    jobName = tostring(jobName):lower()
    grade = math.tointeger(tonumber(grade)) or 0
    if jobName == 'unemployed' then return false, { code = 'unemployed', message = 'players cannot be added to the unemployed job' } end
    local job = qboxJobs()[jobName]
    if not job then return groupNotFound('job_not_found', jobName) end
    if not job.grades[grade] then return false, { code = 'job_missing_grade', message = ('job %s does not have grade %s'):format(jobName, grade) } end
    local source = Bridge.sourceByCitizenId(tostring(citizenid))
    if not source then return playerNotFound(tostring(citizenid)) end
    if jobMap(Bridge.players[source])[jobName] == grade then return true end
    if not core:SetJob(source, jobName, grade) then return false, { code = 'max_jobs', message = 'ai-core refused the job (maximum jobs reached)' } end
    return true
end

---@param citizenid string|integer
---@param jobName string
---@return boolean, QboxErrorResult?
local function removePlayerFromJob(citizenid, jobName)
    if jobName == 'unemployed' then return false, { code = 'unemployed', message = 'players cannot be removed from the unemployed job' } end
    local source = Bridge.sourceByCitizenId(tostring(citizenid))
    if not source then return playerNotFound(tostring(citizenid)) end
    if jobMap(Bridge.players[source])[jobName] == nil then return true end
    return core:RemoveJob(source, jobName) == true
end

--- The primary job is ai-core's current job: the on-duty one, so making a job primary puts the player on its duty.
---@param citizenid string|integer
---@param jobName string
---@return boolean, QboxErrorResult?
local function setPrimaryJob(citizenid, jobName)
    local source = Bridge.sourceByCitizenId(tostring(citizenid))
    if not source then return playerNotFound(tostring(citizenid)) end
    if jobName == 'unemployed' then return core:SetDuty(source, nil) == true end
    if jobMap(Bridge.players[source])[jobName] == nil then
        return false, { code = 'player_not_in_job', message = ('player %s does not have job %s'):format(tostring(citizenid), tostring(jobName)) }
    end
    if not qboxJobs()[jobName] then return groupNotFound('job_not_found', jobName) end
    return core:SetDuty(source, jobName) == true
end

provide('AddPlayerToJob', addPlayerToJob)
provide('RemovePlayerFromJob', removePlayerFromJob)
provide('SetPlayerPrimaryJob', setPrimaryJob)
provide('SetJob', function(identifier, jobName, grade)
    local source = resolveSource(identifier)
    if not source or type(jobName) ~= 'string' then return false end
    jobName = jobName:lower()
    local citizenid = Bridge.players[source].character.citizenid
    if jobName == 'unemployed' then
        local current = Bridge.jobOf(Bridge.players[source]).name
        if current == 'unemployed' then return true end
        return removePlayerFromJob(citizenid, current)
    end
    local ok, err = addPlayerToJob(citizenid, jobName, grade)
    if not ok then return false, err end
    return true
end)
provide('SetJobDuty', function(identifier, onDuty)
    local source = resolveSource(identifier)
    if not source then return end
    local job = Bridge.jobOf(Bridge.players[source])
    core:SetDuty(source, onDuty and job.name or nil)
end)

---@param citizenid string|integer
---@param gangName string
---@param grade? integer
---@return boolean, QboxErrorResult?
local function addPlayerToGang(citizenid, gangName, grade)
    gangName = tostring(gangName):lower()
    grade = math.tointeger(tonumber(grade)) or 0
    if gangName == 'none' then return false, { code = 'none', message = 'none is the default gang, so players cannot be added to it' } end
    local gang = qboxGangs()[gangName]
    if not gang then return groupNotFound('gang_not_found', gangName) end
    if not gang.grades[grade] then return false, { code = 'gang_missing_grade', message = ('gang %s does not have grade %s'):format(gangName, grade) } end
    local source = Bridge.sourceByCitizenId(tostring(citizenid))
    if not source then return playerNotFound(tostring(citizenid)) end
    if gangMap(Bridge.players[source])[gangName] == grade then return true end
    if not core:SetGang(source, gangName, grade) then return false, { code = 'max_gangs', message = 'ai-core refused the gang (maximum gangs reached)' } end
    return true
end

---@param citizenid string|integer
---@param gangName string
---@return boolean, QboxErrorResult?
local function removePlayerFromGang(citizenid, gangName)
    if gangName == 'none' then return false, { code = 'none', message = 'none is the default gang, so players cannot be removed from it' } end
    local source = Bridge.sourceByCitizenId(tostring(citizenid))
    if not source then return playerNotFound(tostring(citizenid)) end
    if gangMap(Bridge.players[source])[gangName] == nil then return true end
    return core:RemoveGang(source, gangName) == true
end

--- The primary gang is ai-core's active gang.
---@param citizenid string|integer
---@param gangName string
---@return boolean, QboxErrorResult?
local function setPrimaryGang(citizenid, gangName)
    local source = Bridge.sourceByCitizenId(tostring(citizenid))
    if not source then return playerNotFound(tostring(citizenid)) end
    if gangName == 'none' then return core:SetActiveGang(source, nil) == true end
    if gangMap(Bridge.players[source])[gangName] == nil then
        return false, { code = 'player_not_in_gang', message = ('player %s does not have gang %s'):format(tostring(citizenid), tostring(gangName)) }
    end
    if not qboxGangs()[gangName] then return groupNotFound('gang_not_found', gangName) end
    return core:SetActiveGang(source, gangName) == true
end

provide('AddPlayerToGang', addPlayerToGang)
provide('RemovePlayerFromGang', removePlayerFromGang)
provide('SetPlayerPrimaryGang', setPrimaryGang)
provide('SetGang', function(identifier, gangName, grade)
    local source = resolveSource(identifier)
    if not source or type(gangName) ~= 'string' then return false end
    gangName = gangName:lower()
    local citizenid = Bridge.players[source].character.citizenid
    if gangName == 'none' then
        local current = Bridge.gangOf(Bridge.players[source]).name
        if current == 'none' then return true end
        return removePlayerFromGang(citizenid, current)
    end
    local ok, err = addPlayerToGang(citizenid, gangName, grade)
    if not ok then return false, err end
    return setPrimaryGang(citizenid, gangName)
end)

provide('GetGroups', function(source)
    local player = BridgeQB.getPlayer(source)
    return player and BridgeQbox.groups(player.PlayerData) or {}
end)
provide('HasGroup', function(source, filter)
    local player = BridgeQB.getPlayer(source)
    return player ~= nil and BridgeQbox.hasGroup(filter, player.PlayerData)
end)
provide('HasPrimaryGroup', function(source, filter)
    local player = BridgeQB.getPlayer(source)
    return player ~= nil and BridgeQbox.hasGroup(filter, player.PlayerData, true)
end)

--- Members of a job or gang: the loaded characters (ai-core has no export for stored memberships).
provide('GetGroupMembers', function(group, groupType)
    local out = {}
    for _, mirror in pairs(Bridge.players) do
        local list, key = groupType == 'gang' and mirror.gangs or mirror.jobs, groupType == 'gang' and 'gang' or 'job'
        for _, m in ipairs(list) do
            if m[key] == group then out[#out + 1] = { citizenid = mirror.character.citizenid, grade = m.grade } end
        end
    end
    return out
end)

---@param value any
---@param wanted any
---@param strict boolean
---@return boolean
local function metaMatches(value, wanted, strict)
    if type(wanted) == 'number' then
        value = tonumber(value)
        return value ~= nil and (strict and value == wanted or not strict and value >= wanted)
    end
    return value == wanted
end

--- Qbox's SearchPlayers filters (license, job, gang, charinfo, metadata) over the loaded characters.
provide('SearchPlayers', function(filters)
    filters = type(filters) == 'table' and filters or {}
    local out = {}
    for source in pairs(Bridge.players) do
        local player = BridgeQB.getPlayer(source)
        local data = player and player.PlayerData
        local ok = data ~= nil
        if ok and filters.license and data.license ~= filters.license then ok = false end
        if ok and filters.job and data.job.name ~= filters.job then ok = false end
        if ok and filters.gang and data.gang.name ~= filters.gang then ok = false end
        if ok and type(filters.charinfo) == 'table' then
            for key, value in pairs(filters.charinfo) do
                if data.charinfo[key] ~= value then ok = false break end
            end
        end
        if ok and type(filters.metadata) == 'table' then
            local strict = filters.metadata.strict == true
            for key, value in pairs(filters.metadata) do
                if key ~= 'strict' and not metaMatches(data.metadata[key], value, strict) then ok = false break end
            end
        end
        if ok then out[#out + 1] = player end
    end
    return out
end)

--- On-duty count of a job and the on-duty sources (Qbox's GetDutyCountJob).
---@param job string
---@return integer, integer[]
local function dutyCount(job)
    local sources = {}
    for source in pairs(Bridge.onDutyIn(job)) do sources[#sources + 1] = source end
    return #sources, sources
end

provide('GetDutyCountJob', dutyCount)
provide('GetDutyCountType', function(jobType)
    local sources = {}
    for job, definition in pairs(Bridge.jobDefinitions()) do
        if definition.type == jobType then
            for source in pairs(Bridge.onDutyIn(job)) do sources[#sources + 1] = source end
        end
    end
    return #sources, sources
end)

-- Items.

provide('CreateUseableItem', function(name, cb) QBCore.Functions.CreateUseableItem(name, cb) end)
--- Qbox answers the callback itself (ox_inventory calls it with `(source, item)`).
provide('CanUseItem', function(name)
    if not core:IsUsableItem(name) then return nil end
    return function(source, item) return Bridge.useItem(source, name, item) end
end)

provide('Notify', function(source, text, kind, duration, subTitle)
    Bridge.notify(source, BridgeQbox.notifyText(text, subTitle), kind, duration)
end)
provide('GetCoreObject', function() return BridgeQB.coreObject() end)
provide('GetCoreVersion', function() return BridgeQbox.VERSION end)

---@type table<string, fun(): string|integer>
local UNIQUE = {
    citizenid = function() return QBCore.Player.CreateCitizenId() end,
    AccountNumber = function() return QBCore.Functions.CreateAccountNumber() end,
    PhoneNumber = function() return QBCore.Functions.CreatePhoneNumber() end,
    FingerId = function() return QBCore.Player.CreateFingerId() end,
    WalletId = function() return QBCore.Player.CreateWalletId() end,
    SerialNumber = function() return QBCore.Player.CreateSerialNumber() end,
}

--- A value in the shape of Qbox's unique identifiers (not checked against stored characters).
provide('GenerateUniqueIdentifier', function(kind)
    local generate = UNIQUE[kind]
    return generate and generate() or QBCore.Shared.RandomStr(8)
end)
