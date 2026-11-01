-- QBCore on ai-core, server side: `exports['qb-core']:GetCoreObject()`, `QBCore:GetObject`, the Player object and
-- QBCore's server events. Everything reads the shared mirror (bridge/core/server.lua) and writes through ai-core.
-- QBCore.Functions beyond the Player, QBCore.Player, commands and the net events: bridge/qb/server_functions.lua;
-- the static Shared tables: bridge/qb/server_shared.lua.

local core = Bridge.core

---@class QBJob
---@field name string
---@field label string
---@field type string
---@field payment number
---@field onduty boolean
---@field isboss boolean
---@field grade { name: string, level: integer }

---@class QBGang
---@field name string
---@field label string
---@field isboss boolean
---@field grade { name: string, level: integer }

---@class QBCharInfo
---@field firstname string
---@field lastname string
---@field birthdate string
---@field gender integer
---@field nationality string
---@field phone string
---@field account string
---@field card? string|integer

---@class QBItem
---@field name string
---@field label string
---@field amount integer
---@field count integer
---@field info table
---@field slot integer
---@field weight number
---@field type string
---@field unique boolean
---@field useable boolean
---@field image string
---@field shouldClose boolean
---@field description string

---@class QBPlayerData
---@field source? integer
---@field citizenid string
---@field cid integer
---@field license string|nil
---@field name string
---@field money table<string, number>
---@field charinfo QBCharInfo
---@field job QBJob
---@field gang QBGang
---@field metadata table<string, any>
---@field position vector3|table
---@field items table<integer, QBItem>
---@field optin boolean

---@class QBPlayerFunctions
---@field GetPlayerData fun(): QBPlayerData
---@field UpdateClient fun(key?: string, value?: any)
---@field UpdatePlayerData fun(key?: string, value?: any)
---@field AddMoney fun(moneytype: string, amount: number, reason?: string): boolean
---@field RemoveMoney fun(moneytype: string, amount: number, reason?: string): boolean
---@field SetMoney fun(moneytype: string, amount: number, reason?: string): boolean
---@field GetMoney fun(moneytype: string): number|false
---@field SetJob fun(job: string, grade?: integer|string): boolean
---@field SetJobDuty fun(onDuty: boolean)
---@field SetGang fun(gang: string, grade?: integer|string): boolean
---@field SetPlayerData fun(key: string, value: any)
---@field SetMetaData fun(key: string, value: any)
---@field GetMetaData fun(key: string): any
---@field AddRep fun(rep: string, amount: number)
---@field RemoveRep fun(rep: string, amount: number)
---@field GetRep fun(rep: string): number|nil
---@field AddJobReputation fun(amount: number)
---@field AddItem fun(item: string, amount: integer, slot?: integer, info?: table): boolean
---@field RemoveItem fun(item: string, amount: integer, slot?: integer): boolean
---@field GetItemByName fun(item: string): QBItem|nil
---@field GetItemsByName fun(item: string): QBItem[]
---@field GetItemBySlot fun(slot: integer): QBItem|nil
---@field HasItem fun(items: string|string[]|table<string, integer>, amount?: integer): boolean
---@field ClearInventory fun(keep?: string|string[])
---@field SetInventory fun(items: table): boolean
---@field SetCreditCard fun(cardNumber: string|integer)
---@field GetCardSlot fun(cardNumber: string|integer, cardType: string): integer|nil
---@field GetName fun(): string
---@field Notify fun(text: string, type?: string, length?: integer)
---@field Save fun()
---@field Logout fun()
---@field AddMethod fun(name: string, handler: function): boolean
---@field AddField fun(name: string, data: any): boolean

---@class QBPlayer
---@field PlayerData QBPlayerData
---@field Functions QBPlayerFunctions
---@field Offline boolean

local qbJob, qbGang = BridgeShapes.qbJob, BridgeShapes.qbGang

--- ai-core metadata key for the QB charinfo values ai-core has no column for (bank account number, credit card, the
--- phone number used while no phone script answers); kept out of `PlayerData.metadata`.
local CHARINFO_KEY = 'qbcharinfo'

--- QB's metadata defaults under ai-core's character metadata (the mirror follows ai-core's `metaChanged`).
local META_DEFAULTS = {
    hunger = 100, thirst = 100, stress = 0, isdead = false, inlaststand = false, ishandcuffed = false, armor = 0,
    tracker = false, injail = 0, jailitems = {}, status = {}, phone = {}, rep = {}, callsign = 'NO CALLSIGN',
    jobrep = { tow = 0, trucker = 0, taxi = 0, hotdog = 0 },
    criminalrecord = { hasRecord = false },
    licences = { driver = true, business = false, weapon = false },
    inside = { apartment = {} },
}

---@param value any
---@return any
local function copy(value)
    if type(value) ~= 'table' then return value end
    local out = {}
    for k, v in pairs(value) do out[k] = copy(v) end
    return out
end

---@param mirror { metadata: table<string, any> } a mirror or a stored character
---@return table<string, any>
local function metadataOf(mirror)
    local out = {}
    for key, value in pairs(META_DEFAULTS) do out[key] = copy(value) end
    for key, value in pairs(mirror.metadata) do out[key] = value end
    out[CHARINFO_KEY] = nil
    return out
end

--- QB charinfo values ai-core keeps on the character (names, birth date, nationality, gender) as one
--- `SetCharacterInfo` patch of the ones that differ from `charinfo`; nil when none does. A loaded character's sex is
--- left out (ai-core changes it only while the character is not loaded: the ped model follows it).
---@param value table
---@param charinfo QBCharInfo
---@param loaded boolean
---@return table<string, string>|nil
local function charinfoPatch(value, charinfo, loaded)
    local patch, any = {}, false
    for _, field in ipairs({ 'firstname', 'lastname', 'nationality' }) do
        if type(value[field]) == 'string' and value[field] ~= charinfo[field] then patch[field], any = value[field], true end
    end
    local birthdate = Bridge.isoDate(value.birthdate)
    if birthdate and birthdate ~= charinfo.birthdate then patch.birthdate, any = birthdate, true end
    if not loaded and value.gender ~= nil then
        local sex = Bridge.sexOf(value.gender)
        if sex ~= (charinfo.gender == 1 and 'female' or 'male') then patch.sex, any = sex, true end
    end
    return any and patch or nil
end

--- Applies a charinfo patch to QB's charinfo shape.
---@param charinfo QBCharInfo
---@param patch table<string, string>
local function applyCharinfo(charinfo, patch)
    for key, value in pairs(patch) do
        if key == 'sex' then charinfo.gender = value == 'female' and 1 or 0 else charinfo[key] = value end
    end
end

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
---@type table<integer, integer> source -> GetGameTimer() of the last `PlayerData.items` read
local itemsReadAt = {}

--- `PlayerData.items` is read from the inventory layer at most once a second per player (ai-core has no per-player
--- item change event); the bridge's own item calls read it again at once.
local ITEMS_TTL = 1000

--- One inventory stack in QB's item shape (the item definition from the cached QB item table).
---@param stack { name: string, label?: string, count: integer, slot: integer, metadata?: table }
---@return QBItem
local function qbStack(stack)
    local def = Bridge.itemDefinition(stack.name) or {}
    return {
        name = stack.name, label = stack.label or def.label or stack.name, amount = stack.count, count = stack.count,
        info = stack.metadata or {}, slot = stack.slot, weight = def.weight or 0, type = def.type or 'item',
        unique = def.unique or false, useable = def.useable or false, image = def.image or ('%s.png'):format(stack.name),
        shouldClose = def.shouldClose or false, description = def.description or '',
    }
end

---@param source integer
---@return table<integer, QBItem>
local function itemsOf(source)
    local out = {}
    for _, stack in ipairs(core:GetItems(source) or {}) do out[stack.slot] = qbStack(stack) end
    itemsReadAt[source] = GetGameTimer()
    return out
end

--- QB / qb-inventory HasItem: a name, a list of names (each `amount`) or `{ [name] = amount }`.
---@param source integer
---@param items string|string[]|table<string, integer>
---@param amount? integer
---@return boolean
local function hasItem(source, items, amount)
    if type(items) == 'string' then return core:HasItem(source, items, amount or 1) == true end
    if type(items) ~= 'table' then return false end
    if items[1] ~= nil then
        for _, name in ipairs(items) do
            if core:HasItem(source, name, amount or 1) ~= true then return false end
        end
        return true
    end
    for name, count in pairs(items) do
        if core:HasItem(source, name, tonumber(count) or 1) ~= true then return false end
    end
    return true
end

---@param value any
---@return boolean
local function isCallable(value)
    if type(value) == 'function' then return true end
    return type(value) == 'table' and type(rawget(value, '__cfx_functionReference')) == 'string'
end

--- QB's AddMethod / AddField on a Player object (fields at its root, methods in `Functions`).
---@param player QBPlayer
---@param functions QBPlayerFunctions
local function addExtensions(player, functions)
    functions.AddMethod = function(name, handler)
        if type(name) ~= 'string' or not isCallable(handler) then return false end
        player[name] = handler
        functions[name] = handler
        return true
    end
    functions.AddField = function(name, value)
        if type(name) ~= 'string' or isCallable(value) or name == 'PlayerData' or name == 'Functions' or name == 'Offline' then return false end
        player[name] = value
        return true
    end
end

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

local qbJobDefinition, qbGangDefinition = BridgeShapes.qbJobDefinition, BridgeShapes.qbGangDefinition

--- Items other scripts added with QBCore.Functions.AddItem: shown in QBCore.Shared next to the inventory's own
--- (server_functions.lua keeps them). Jobs and gangs scripts add are ai-core definitions (in `Bridge.jobDefinitions`).
---@type { Items: table<string, table> }
local added = { Items = {} }

--- QBCore.Shared.Jobs / Gangs in QB's shape (grades keyed by their index as text): ai-core's panel and script jobs.
local function sharedJobs()
    local out = {}
    for name, definition in pairs(Bridge.jobDefinitions()) do out[name] = qbJobDefinition(definition) end
    return out
end

local function sharedGangs()
    local out = {}
    for name, definition in pairs(Bridge.gangDefinitions()) do out[name] = qbGangDefinition(definition) end
    return out
end

local function sharedItems()
    local out = Bridge.itemDefinitions()
    for name, value in pairs(added.Items) do
        if out[name] == nil then out[name] = value end
    end
    return out
end

---@type table<string, fun(source: integer, cb: function, ...)>
local callbacks = {}

--- Every ai-core account type at its starting amount (QB's `PlayerDefaults.money`).
---@return table<string, number>
local function defaultMoney()
    local out = {}
    for name, definition in pairs(core:GetAccountTypes() or {}) do out[name] = definition.start end
    return out
end

---@class QBCoreServer
---@field Debug fun(tbl: any, indent?: integer)
---@field ShowError fun(resource: string, message: string)
---@field ShowSuccess fun(resource: string, message: string)
QBCore = {
    Players = qbPlayers,
    PlayersByCitizenId = byCitizenPlayer,
    ---@type table<string, function>
    Player = {},
    ---@type table<string, { id: integer, bucket: integer }>
    Player_Buckets = {},
    ---@type table<integer, { id: integer, bucket: integer }>
    Entity_Buckets = {},
    ---@type table<string, { func: function, resource: string }>
    UsableItems = {},
    ServerCallbacks = callbacks,
    ---@type table<string, { callback?: function, promise: table }>
    ClientCallbacks = {},
    Config = {
        MaxPlayers = GetConvarInt('sv_maxclients', 48),
        DefaultSpawn = vector4(-1035.71, -2731.87, 12.86, 0.0),
        UpdateInterval = 5,
        StatusInterval = 5000,
        Money = { MoneyTypes = { cash = 500, bank = 5000, crypto = 0 }, DontAllowMinus = { 'cash', 'crypto' }, MinusLimit = -5000, PayCheckTimeOut = 10, PayCheckSociety = false },
        Player = {
            HungerRate = 4.2,
            ThirstRate = 3.8,
            Bloodtypes = { 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-' },
            ---@type table
            PlayerDefaults = {},
        },
        Server = {
            Closed = false, ClosedReason = 'Server Closed', Uptime = 0, Whitelist = false, WhitelistPermission = 'admin', PVP = true,
            Discord = '', CheckDuplicateLicense = true, Permissions = { 'god', 'admin', 'mod' },
        },
        Commands = { OOCColor = { 255, 151, 133 } },
        Notify = {
            NotificationStyling = { group = false, position = 'right', progress = true },
            VariantDefinitions = {
                success = { classes = 'success', icon = 'check_circle' }, primary = { classes = 'primary', icon = 'notifications' },
                warning = { classes = 'warning', icon = 'warning' }, error = { classes = 'error', icon = 'error' },
                police = { classes = 'police', icon = 'local_police' }, ambulance = { classes = 'ambulance', icon = 'fas fa-ambulance' },
            },
        },
    },
    ---@type table<string, any>
    Shared = { Jobs = {}, Gangs = {}, Items = {} },
    Commands = {
        ---@type table<string, { name: string, permission: string|string[], help: string, arguments: table, argsrequired: boolean, callback: function }>
        List = {},
        IgnoreList = { god = true, user = true },
    },
    ---@type table<string, function>
    Functions = {},
}

-- QB's player defaults (the shape `QBCore.Player.CheckPlayerData` fills a new PlayerData from).
QBCore.Config.Player.PlayerDefaults = {
    citizenid = function() return QBCore.Player.CreateCitizenId() end,
    cid = 1,
    money = defaultMoney,
    optin = true,
    charinfo = {
        firstname = 'Firstname', lastname = 'Lastname', birthdate = '00-00-0000', gender = 0, nationality = 'USA',
        phone = function() return QBCore.Functions.CreatePhoneNumber() end,
        account = function() return QBCore.Functions.CreateAccountNumber() end,
    },
    job = { name = 'unemployed', label = 'Civilian', payment = 10, type = 'none', onduty = false, isboss = false, grade = { name = 'Freelancer', level = 0 } },
    gang = { name = 'none', label = 'No Gang Affiliation', isboss = false, grade = { name = 'none', level = 0 } },
    metadata = {
        hunger = 100, thirst = 100, stress = 0, isdead = false, inlaststand = false, armor = 0, ishandcuffed = false, tracker = false,
        injail = 0, jailitems = {}, status = {}, phone = {}, rep = {}, callsign = 'NO CALLSIGN',
        bloodtype = function() return BridgeQB.generatedMeta.bloodtype() end,
        fingerprint = function() return QBCore.Player.CreateFingerId() end,
        walletid = function() return QBCore.Player.CreateWalletId() end,
        criminalrecord = { hasRecord = false },
        licences = { driver = true, business = false, weapon = false },
        inside = { apartment = {} },
        phonedata = { SerialNumber = function() return QBCore.Player.CreateSerialNumber() end, InstalledApps = {} },
    },
    position = QBCore.Config.DefaultSpawn,
    items = {},
}

---@param length integer
---@param charset string
---@return string
local function randomFrom(length, charset)
    local out = {}
    for i = 1, length do
        local n = math.random(#charset)
        out[i] = charset:sub(n, n)
    end
    return table.concat(out)
end

local LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
local DIGITS = '0123456789'

-- QB's id generators. qb-core checks each against its `players` table; ai-core keeps no such table, so these draw from
-- the same large random spaces without a database check (ai-core's own citizenid is the character's row id).
---@return string
function QBCore.Player.CreateCitizenId() return (randomFrom(3, LETTERS) .. randomFrom(5, DIGITS)):upper() end
---@return string
function QBCore.Player.CreateFingerId()
    return randomFrom(2, LETTERS) .. randomFrom(3, DIGITS) .. randomFrom(1, LETTERS) .. randomFrom(2, DIGITS) .. randomFrom(3, LETTERS) .. randomFrom(4, DIGITS)
end
---@return string
function QBCore.Player.CreateWalletId() return 'QB-' .. math.random(11111111, 99999999) end
---@return integer
function QBCore.Player.CreateSerialNumber() return math.random(11111111, 99999999) end
---@return string
function QBCore.Functions.CreateAccountNumber()
    return 'US0' .. math.random(1, 9) .. 'QBCore' .. math.random(1111, 9999) .. math.random(1111, 9999) .. math.random(11, 99)
end
---@return string
function QBCore.Functions.CreatePhoneNumber() return math.random(100, 999) .. math.random(1000000, 9999999) end

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

---@param name string
---@param cb fun(source: integer, cb: function, ...)
function QBCore.Functions.CreateCallback(name, cb)
    callbacks[name] = cb
end

---@param name string
---@param data function|{ cb?: function, callback?: function }
function QBCore.Functions.CreateUseableItem(name, data)
    local cb = data
    if type(data) == 'table' and not isCallable(data) then cb = data.cb or data.callback end
    if not isCallable(cb) then return end
    ---@cast cb function
    QBCore.UsableItems[name] = { func = cb, resource = GetInvokingResource() or 'ai-core' }
    local inv = Bridge.inventory()
    if inv then inv:RegisterUsableItem(name, function(source, item) cb(source, qbStack(item)) end) end
end

--- What the inventory (qb-inventory, tgiann-inventory) calls when a player uses an item: QB's `{ func }` entry or nil.
---@param name string
---@return { func: fun(source: integer, item?: table): any, resource: string }|nil
function QBCore.Functions.CanUseItem(name)
    if not core:IsUsableItem(name) then return nil end
    return { func = function(source, item) return Bridge.useItem(source, name, item) end, resource = 'ai-core' }
end

---@param source integer
---@param items string|string[]|table<string, integer>
---@param amount? integer
function QBCore.Functions.HasItem(source, items, amount)
    return hasItem(source, items, amount)
end

RegisterNetEvent('QBCore:Server:TriggerCallback', function(name, ...)
    local src = source
    if type(name) ~= 'string' or not Bridge.allow(src) then return end
    local cb = callbacks[name]
    if not cb then return end
    cb(src, function(...)
        TriggerClientEvent('QBCore:Client:TriggerCallback', src, name, ...)
    end, ...)
end)

--- The core object another resource gets is a copy: its Shared tables and live config values are filled at that
--- moment. `filters` (QB 1.3) picks only those top-level keys.
---@param filters? string[]
---@return QBCoreServer|table
local function coreObject(filters)
    QBCore.Shared.Jobs = sharedJobs()
    QBCore.Shared.Gangs = sharedGangs()
    QBCore.Shared.Items = sharedItems()
    local types = core:GetAccountTypes() or {}
    local moneyTypes, noMinus = {}, {}
    for name, definition in pairs(types) do
        moneyTypes[name] = definition.start
        if not definition.allowNegative then noMinus[#noMinus + 1] = name end
    end
    if next(moneyTypes) then
        QBCore.Config.Money.MoneyTypes = moneyTypes
        QBCore.Config.Money.DontAllowMinus = noMinus
    end
    QBCore.Config.Server.PVP = GlobalState['ai:pvp'] ~= false
    if type(filters) ~= 'table' then return QBCore end
    local out = {}
    for _, key in ipairs(filters) do
        if QBCore[key] ~= nil then out[key] = QBCore[key] end
    end
    return out
end

AddEventHandler('QBCore:GetObject', function(cb)
    cb(coreObject())
end)
Bridge.provideExport('qb-core', 'GetCoreObject', coreObject)

-- QBCore's server events from ai-core's changes (same names and arguments as QBCore).
Bridge.on('loaded', function(source)
    local player = build(source)
    if not player then return end
    TriggerEvent('QBCore:Server:PlayerLoaded', player)
    player.Functions.UpdateClient()
end)

Bridge.on('unloaded', function(source, reason)
    local player = qbPlayers[source]
    if reason == 'dropped' then TriggerEvent('QBCore:Server:PlayerDropped', source) end
    TriggerEvent('QBCore:Server:OnPlayerUnload', source)
    if player then
        local data = player.PlayerData
        if byPhone[data.charinfo.phone] == source then byPhone[data.charinfo.phone] = nil end
        if byAccount[data.charinfo.account] == source then byAccount[data.charinfo.account] = nil end
        if data.license and byLicense[data.license] == source then byLicense[data.license] = nil end
        if byCitizenPlayer[data.citizenid] == player then byCitizenPlayer[data.citizenid] = nil end
    end
    qbPlayers[source] = nil
    itemsReadAt[source] = nil
end)

Bridge.on('money', function(source, account, _, delta, reason)
    TriggerEvent('QBCore:Server:OnMoneyChange', source, account, math.abs(delta), delta >= 0 and 'add' or 'remove', reason)
    local player = qbPlayers[source]
    if player then playerUpdated(source, 'money', player.PlayerData.money) end
end)

Bridge.on('job', function(source, job)
    local player = qbPlayers[source]
    local view = qbJob(job)
    local wasOnDuty = player and player.PlayerData.job.onduty
    if player then player.PlayerData.job = view end
    TriggerEvent('QBCore:Server:OnJobUpdate', source, qbJob(job))
    if player then playerUpdated(source, 'job', view) end
    if wasOnDuty ~= nil and wasOnDuty ~= view.onduty then TriggerEvent('QBCore:Server:SetDuty', source, view.onduty) end
end)

Bridge.on('gang', function(source, gang)
    local player = qbPlayers[source]
    if player then player.PlayerData.gang = qbGang(gang) end
    TriggerEvent('QBCore:Server:OnGangUpdate', source, qbGang(gang))
    if player then playerUpdated(source, 'gang', player.PlayerData.gang) end
end)

Bridge.on('meta', function(source, key, value)
    local player = qbPlayers[source]
    if not player then return end
    local data = player.PlayerData
    if key == CHARINFO_KEY then
        if type(value) ~= 'table' then return end
        byAccount[data.charinfo.account] = nil
        if value.account then data.charinfo.account = value.account end
        data.charinfo.card = value.card
        byAccount[data.charinfo.account] = source
        playerUpdated(source, 'charinfo', data.charinfo)
        return
    end
    if value == nil then value = copy(META_DEFAULTS[key]) end
    data.metadata[key] = value
    playerUpdated(source, 'metadata', data.metadata)
end)

-- ai-core changed the character's name, birth date or nationality (QB / Qbox SetCharInfo).
Bridge.on('character', function(source)
    local player, mirror = qbPlayers[source], Bridge.players[source]
    if not player or not mirror then return end
    local c, charinfo = mirror.character, player.PlayerData.charinfo
    applyCharinfo(charinfo, { firstname = c.firstname, lastname = c.lastname, birthdate = c.birthdate, nationality = c.nationality or '', sex = c.sex })
    playerUpdated(source, 'charinfo', charinfo)
end)

-- A panel edit of a job or gang: QB's shared update (server object refresh, every client's Shared table).
AddEventHandler('ai-core:definitionsChanged', function(file, name)
    local tableName = file == 'jobs' and 'Jobs' or file == 'gangs' and 'Gangs' or nil
    if not tableName or type(name) ~= 'string' then return end
    local definition = (file == 'jobs' and Bridge.jobDefinitions() or Bridge.gangDefinitions())[name]
    local value = definition and (file == 'jobs' and qbJobDefinition(definition --[[@as AiJobDefinition]]) or qbGangDefinition(definition)) or nil
    TriggerClientEvent('QBCore:Client:OnSharedUpdate', -1, tableName, name, value)
    TriggerEvent('QBCore:Server:UpdateObject')
end)

BridgeQB = {
    getPlayer = getPlayer,
    getPlayerByCitizenId = getPlayerByCitizenId,
    qbJob = qbJob,
    sharedJobs = sharedJobs,
    sharedGangs = sharedGangs,
    sharedItems = sharedItems,
    coreObject = coreObject,
    qbStack = qbStack,
    hasItem = hasItem,
    isCallable = isCallable,
    addExtensions = addExtensions,
    copy = copy,
    metaDefaults = META_DEFAULTS,
    metadataOf = metadataOf,
    charinfoKey = CHARINFO_KEY,
    charinfoPatch = charinfoPatch,
    applyCharinfo = applyCharinfo,
    playerUpdated = playerUpdated,
    added = added,
    ---@param phone string
    ---@return integer|nil
    sourceByPhone = function(phone) return byPhone[tostring(phone)] end,
    ---@param account string
    ---@return integer|nil
    sourceByAccount = function(account) return byAccount[account] end,
    --- QB's per-character values made once and kept in ai-core's metadata.
    ---@type table<string, fun(): any>
    generatedMeta = {
        bloodtype = function()
            local types = QBCore.Config.Player.Bloodtypes
            return types[math.random(#types)]
        end,
        fingerprint = function() return QBCore.Player.CreateFingerId() end,
        walletid = function() return QBCore.Player.CreateWalletId() end,
        phonedata = function() return { SerialNumber = QBCore.Player.CreateSerialNumber(), InstalledApps = {} } end,
    },
    --- Set by server_functions.lua: a stored character as an offline QB Player (waits; call from a thread).
    ---@type fun(citizenid: string): QBPlayer|nil
    getOfflinePlayer = getPlayerByCitizenId,
}
