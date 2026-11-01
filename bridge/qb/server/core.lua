-- The server's QBCore object: Players, Config, Shared, Commands and the Functions table the files after this fill.

local core = Bridge.core
local qbPlayers, byCitizenPlayer = BridgeQB.players, BridgeQB.byCitizenId

local qbJobDefinition, qbGangDefinition = BridgeShapes.qbJobDefinition, BridgeShapes.qbGangDefinition

--- Items other scripts added with QBCore.Functions.AddItem: shown in QBCore.Shared next to the inventory's own
--- (bridge/qb/server/shared_items.lua keeps them). Jobs and gangs scripts add are ai-core definitions (in `Bridge.jobDefinitions`).
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

BridgeQB.added = added
BridgeQB.sharedJobs = sharedJobs
BridgeQB.sharedGangs = sharedGangs
BridgeQB.sharedItems = sharedItems
BridgeQB.callbacks = callbacks
