-- ESX on ai-core, server side: the xPlayer, built once per load from the shared mirror with its methods
-- (identity.lua, money.lua, inventory.lua, weapons.lua, meta.lua) and the registered overrides.

local core = Bridge.core
local xPlayers, esxJob = BridgeESX.xPlayers, BridgeESX.esxJob
local accountsOf, inventoryOf, loadoutOf = BridgeESX.accountsOf, BridgeESX.inventoryOf, BridgeESX.loadoutOf
local functionOverrides, applyOverrides = BridgeESX.functionOverrides, BridgeESX.applyOverrides

---@class xPlayer
---@field source integer
---@field playerId integer
---@field identifier string citizenid
---@field license string|nil
---@field ssn string from the character id (`XXX-XX-XXXX`)
---@field name string
---@field job ESXJob
---@field group string `admin` with the `ai.admin` ace, else `user`
---@field admin boolean
---@field accounts ESXAccount[] kept current from ai-core's money changes
---@field metadata table ai-core's character metadata (live)
---@field inventory ESXInventoryItem[] refreshed by `getInventory`
---@field loadout ESXInventoryWeapon[] refreshed by `getLoadout`
---@field weight number grams, refreshed by `getWeight`
---@field maxWeight number grams, refreshed by `getMaxWeight`
---@field coords { x: number, y: number, z: number, heading: number }
---@field lastPlaytime number
---@field paycheckEnabled boolean
---@field spawned boolean
---@field variables table
---@field [string] any methods (`getName`, `addAccountMoney`...) and override results

---@param source integer
---@return xPlayer|nil
local function build(source)
    local mirror = Bridge.players[source]
    if not mirror then return nil end
    local c = mirror.character
    local ped = GetPlayerPed(tostring(source))
    local at = ped ~= 0 and GetEntityCoords(ped) or vector3(0.0, 0.0, 0.0)
    local id = ('%09d'):format(c.id % 1000000000)
    local weights = core:GetInventoryWeight(source)
    local self = {
        source = source,
        playerId = source,
        identifier = c.citizenid,
        license = Bridge.license(source),
        ssn = ('%s-%s-%s'):format(id:sub(1, 3), id:sub(4, 5), id:sub(6, 9)),
        name = ('%s %s'):format(c.firstname, c.lastname),
        job = esxJob(Bridge.jobOf(mirror)),
        group = Bridge.isAdmin(source) and 'admin' or 'user',
        admin = Bridge.isAdmin(source),
        accounts = accountsOf(mirror),
        metadata = mirror.metadata,
        inventory = inventoryOf(source),
        loadout = (loadoutOf(source)),
        weight = weights and weights.weight or 0,
        maxWeight = weights and weights.maxWeight or 0,
        coords = { x = at.x, y = at.y, z = at.z, heading = ped ~= 0 and GetEntityHeading(ped) or 0.0 },
        lastPlaytime = tonumber(mirror.metadata.lastPlaytime) or 0,
        paycheckEnabled = true,
        spawned = false,
        variables = {},
    }
    BridgeESX.xPlayerIdentity(self, source, mirror)
    BridgeESX.xPlayerMoney(self, source, mirror)
    BridgeESX.xPlayerInventory(self, source)
    BridgeESX.xPlayerWeapons(self, source)
    BridgeESX.xPlayerMeta(self, source, mirror)

    for _, funcs in pairs(functionOverrides) do applyOverrides(self, funcs) end
    xPlayers[source] = self --[[@as xPlayer]]
    return self --[[@as xPlayer]]
end
BridgeESX.build = build

---@param source integer
---@return xPlayer|nil
local function getPlayerFromId(source)
    source = tonumber(source) --[[@as integer]]
    return xPlayers[source] or (Bridge.players[source] and build(source)) or nil
end
BridgeESX.getPlayerFromId = getPlayerFromId
ESX.GetPlayerFromId = getPlayerFromId
