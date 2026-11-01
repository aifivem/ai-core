-- QBCore on ai-core, client side: QBCore.Config, copied from qb-core 1.3.0 (config.lua; GPL-3.0). The Shared helpers
-- and fixed tables are in bridge/qb/shared.lua; jobs, gangs and items are filled in client.lua.
-- Config values ai-core decides itself (money, paycheck, PvP) are only read here: changing them does nothing.

-- QBCore.Config (client copy; `Server.PVP` follows ai-core's PvP switch, set in client.lua) --------------------------

QBCore.Config = {
    MaxPlayers = GetConvarInt('sv_maxclients', 48),
    DefaultSpawn = vector4(-1035.71, -2731.87, 12.86, 0.0),
    UpdateInterval = 5,
    StatusInterval = 5000,
    Money = {
        MoneyTypes = { cash = 500, bank = 5000, crypto = 0 },
        DontAllowMinus = { 'cash', 'crypto' },
        MinusLimit = -5000,
        PayCheckTimeOut = 10,
        PayCheckSociety = false,
    },
    Player = {
        HungerRate = 4.2,
        ThirstRate = 3.8,
        Bloodtypes = { 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-' },
    },
    Server = {
        Closed = false,
        ClosedReason = 'Server Closed',
        Uptime = 0,
        Whitelist = false,
        WhitelistPermission = 'admin',
        PVP = true,
        Discord = '',
        CheckDuplicateLicense = true,
        Permissions = { 'god', 'admin', 'mod' },
    },
    Commands = { OOCColor = { 255, 151, 133 } },
    Notify = {
        NotificationStyling = { group = false, position = 'right', progress = true },
        VariantDefinitions = {
            success = { classes = 'success', icon = 'check_circle' },
            primary = { classes = 'primary', icon = 'notifications' },
            warning = { classes = 'warning', icon = 'warning' },
            error = { classes = 'error', icon = 'error' },
            police = { classes = 'police', icon = 'local_police' },
            ambulance = { classes = 'ambulance', icon = 'fas fa-ambulance' },
        },
    },
}
