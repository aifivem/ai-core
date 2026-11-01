-- QBCore on ai-core, server side, part two: the rest of qb-core's server API (QBCore.Functions lookups, permissions,
-- buckets, vehicles, client callbacks, the Shared registries, QBCore.Player, QBCore.Commands), qb-core's net events and
-- `exports['qb-core']:<every QBCore.Functions name>` as qb-core exports them. Loaded after bridge/qb/server.lua and
-- bridge/qb/server_shared.lua. Behaviour copied from qb-core (https://github.com/qbcore-framework/qb-core, GPL-3.0)
-- where ai-core has no part in it; everything about players forwards to ai-core.

local core = Bridge.core
local getPlayer = BridgeQB.getPlayer

---@param source any
---@return integer|nil
local function playerId(source)
    local id = tonumber(source)
    if not id or math.type(id) ~= 'integer' or id <= 0 then return nil end
    return id --[[@as integer]]
end

--------------------------------------------------------------------------------------------------------------------
-- Lookups
--------------------------------------------------------------------------------------------------------------------

---@param entity integer
---@return vector4
function QBCore.Functions.GetCoords(entity)
    local coords = GetEntityCoords(entity)
    return vector4(coords.x, coords.y, coords.z, GetEntityHeading(entity))
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

---@param coords any
---@return vector3|nil
local function vec3(coords)
    local kind = type(coords)
    if coords == nil or kind == 'number' or kind == 'string' or kind == 'boolean' or kind == 'function' then return nil end
    local x, y, z = tonumber(coords.x), tonumber(coords.y), tonumber(coords.z)
    if not x or not y or not z then return nil end
    return vector3(x, y, z)
end

--- The closest entity of a list to a point (`skip` left out); -1, -1 when none.
---@param list integer[]
---@param origin vector3
---@param skip? integer
---@return integer, number
local function closestOf(list, origin, skip)
    local best, bestDist = -1, -1
    for i = 1, #list do
        local entity = list[i]
        if entity ~= skip then
            local d = #(GetEntityCoords(entity) - origin)
            if bestDist == -1 or d < bestDist then best, bestDist = entity, d end
        end
    end
    return best, bestDist
end

--- The closest other player to a player (ai-lib `nearestPlayerTo`: players in its OneSync scope) or to `coords`.
---@param source integer
---@param coords? vector3|table
---@return integer closestPlayer, number closestDistance
function QBCore.Functions.GetClosestPlayer(source, coords)
    local origin = vec3(coords)
    if not origin then
        local other = aiLib.nearestPlayerTo(source, 500.0)
        if not other then return -1, -1 end
        return other, #(GetEntityCoords(GetPlayerPed(other)) - GetEntityCoords(GetPlayerPed(source)))
    end
    local own = GetPlayerPed(source)
    local best, bestDist = -1, -1
    for _, id in ipairs(GetPlayers()) do
        local ped = GetPlayerPed(id)
        if ped ~= own and ped ~= 0 then
            local d = #(GetEntityCoords(ped) - origin)
            if bestDist == -1 or d < bestDist then best, bestDist = tonumber(id) --[[@as integer]], d end
        end
    end
    return best, bestDist
end

--- The closest vehicle to a player (ai-lib `nearestVehicleTo`) or to `coords`.
---@param source integer
---@param coords? vector3|table
---@return integer closestVehicle, number closestDistance
function QBCore.Functions.GetClosestVehicle(source, coords)
    local origin = vec3(coords)
    if not origin then
        local vehicle = aiLib.nearestVehicleTo(source, math.huge)
        if vehicle == 0 then return -1, -1 end
        return vehicle, #(GetEntityCoords(vehicle) - GetEntityCoords(GetPlayerPed(source)))
    end
    return closestOf(GetAllVehicles() --[[@as integer[] ]], origin)
end

---@param source integer
---@param coords? vector3|table
---@return integer closestObject, number closestDistance
function QBCore.Functions.GetClosestObject(source, coords)
    return closestOf(GetAllObjects() --[[@as integer[] ]], vec3(coords) or GetEntityCoords(GetPlayerPed(source)))
end

---@param source integer
---@param coords? vector3|table
---@return integer closestPed, number closestDistance
function QBCore.Functions.GetClosestPed(source, coords)
    local own = GetPlayerPed(source)
    return closestOf(GetAllPeds() --[[@as integer[] ]], vec3(coords) or GetEntityCoords(own), own)
end

--------------------------------------------------------------------------------------------------------------------
-- QBCore.Player: offline characters and the lifecycle (ai-core loads, saves and deletes characters itself)
--------------------------------------------------------------------------------------------------------------------

--- qb-core's `applyDefaults`; `generate` false leaves the made-on-demand values (ids, money) out.
---@param target table
---@param defaults table
---@param generate boolean
local function applyDefaults(target, defaults, generate)
    for key, value in pairs(defaults) do
        if BridgeQB.isCallable(value) then
            if target[key] == nil and generate then target[key] = value() end
        elseif type(value) == 'table' then
            if target[key] == nil then target[key] = {} end
            if type(target[key]) == 'table' then applyDefaults(target[key], value, generate) end
        elseif target[key] == nil then
            target[key] = value
        end
    end
end

--- A Player object for a character that is not loaded: reads work, changes stay on this object (ai-core has no
--- offline write for money, jobs, gangs or metadata: money changes answer false).
---@param data table QB PlayerData
---@return QBPlayer
local function offlinePlayer(data)
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

--- QB PlayerData of a stored character from ai-core's character info (QB defaults for what ai-core keeps only while
--- the character is loaded: money, jobs, gangs, metadata).
---@param info { id: integer, citizenid: string, slot: integer, firstname: string, lastname: string, birthdate: string, sex: string, nationality: string }
---@return table
local function offlineData(info)
    local data = {
        citizenid = info.citizenid,
        cid = info.slot,
        name = ('%s %s'):format(info.firstname, info.lastname),
        money = {},
        charinfo = {
            firstname = info.firstname, lastname = info.lastname, birthdate = info.birthdate,
            gender = info.sex == 'female' and 1 or 0, nationality = info.nationality or '', phone = '', account = '',
        },
        metadata = {},
        items = {},
    }
    applyDefaults(data, QBCore.Config.Player.PlayerDefaults, false)
    return data
end

--- A character by citizenid: the loaded Player, else an offline Player read through ai-core's `GetCharacterInfo`
--- (ai-core's citizenid is the character's id). Waits: call from a thread.
---@param citizenid string|integer
---@return QBPlayer|nil
local function getOfflinePlayer(citizenid)
    if citizenid == nil then return nil end
    citizenid = tostring(citizenid)
    local online = BridgeQB.getPlayerByCitizenId(citizenid)
    if online then return online end
    local charId = tonumber(citizenid)
    if not charId or math.type(charId) ~= 'integer' or charId <= 0 then return nil end
    local answer = promise.new()
    core:GetCharacterInfo(charId, function(info) answer:resolve(info or false) end)
    local info = Citizen.Await(answer)
    if not info or tostring(info.citizenid) ~= citizenid then return nil end
    return offlinePlayer(offlineData(info))
end

BridgeQB.getOfflinePlayer = getOfflinePlayer
QBCore.Player.GetOfflinePlayer = getOfflinePlayer
QBCore.Functions.GetOfflinePlayerByCitizenId = getOfflinePlayer

--- ai-core logs characters in from its own character screen: a script cannot log a player in.
---@return boolean
function QBCore.Player.Login() return false end

--- Back to ai-core's character screen (QB's logout).
---@param source integer
function QBCore.Player.Logout(source)
    local id = playerId(source)
    if id and Bridge.players[id] then core:SwitchCharacter(id) end
end

---@param license string
---@return QBPlayer|nil
function QBCore.Player.GetPlayerByLicense(license)
    if type(license) ~= 'string' then return nil end
    local source = QBCore.Functions.GetSource(license)
    return source ~= 0 and getPlayer(source) or nil
end

--- ai-core keeps no character list by license that the bridge can read: offline characters by license are not found.
---@return nil
function QBCore.Player.GetOfflinePlayerByLicense() return nil end

QBCore.Functions.GetPlayerByLicense = QBCore.Player.GetPlayerByLicense

--- A loaded player is ai-core's Player; anything else becomes an offline Player object (never stored).
---@param PlayerData table
---@param Offline? boolean
---@return QBPlayer|nil
function QBCore.Player.CreatePlayer(PlayerData, Offline)
    if type(PlayerData) ~= 'table' then return nil end
    local source = playerId(PlayerData.source)
    if not Offline and source and Bridge.players[source] then return getPlayer(source) end
    return offlinePlayer(PlayerData)
end

---@param source? integer
---@param PlayerData? table
---@return QBPlayer|nil
function QBCore.Player.CheckPlayerData(source, PlayerData)
    local id = playerId(source)
    if id and Bridge.players[id] then return getPlayer(id) end
    PlayerData = type(PlayerData) == 'table' and PlayerData or {}
    applyDefaults(PlayerData, QBCore.Config.Player.PlayerDefaults, true)
    return QBCore.Player.CreatePlayer(PlayerData, true)
end

--- ai-core writes money and memberships as they change and the rest periodically and on unload.
---@param source integer
function QBCore.Player.Save(source)
    local player = getPlayer(source)
    if player then player.Functions.Save() end
end

function QBCore.Player.SaveOffline() end

--- Characters are deleted on ai-core's character screen and in its admin panel only.
---@param source integer
---@param citizenid string
function QBCore.Player.DeleteCharacter(source, citizenid)
    print(('^3[ai-core bridge] %s asked to delete character %s (QBCore.Player.DeleteCharacter): characters are deleted on the character screen or in the admin panel^0'):format(GetInvokingResource() or '?', tostring(citizenid)))
end

---@param citizenid string
function QBCore.Player.ForceDeleteCharacter(citizenid)
    QBCore.Player.DeleteCharacter(0, citizenid)
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

--------------------------------------------------------------------------------------------------------------------
-- Routing buckets (qb-core's bookkeeping; the numbers are the script's own)
--------------------------------------------------------------------------------------------------------------------

--- ai-core's bucket allocator hands out ids from 1000 up: a QB script that picks such a number itself may share it.
local warnedBucket = {}

---@param bucket integer
local function warnBucket(bucket)
    local resource = GetInvokingResource() or '?'
    if bucket < 1000 or warnedBucket[resource] then return end
    warnedBucket[resource] = true
    print(('^3[ai-core bridge] %s puts players or entities in routing bucket %d: ids from 1000 up are handed out by ai-core\'s bucket allocator (exports["ai-core"]:AcquireBucket), so this one may already be in use^0'):format(resource, bucket))
end

---@return table<string, { id: integer, bucket: integer }>, table<integer, { id: integer, bucket: integer }>
function QBCore.Functions.GetBucketObjects()
    return QBCore.Player_Buckets, QBCore.Entity_Buckets
end

---@param source integer
---@param bucket integer
---@return boolean
function QBCore.Functions.SetPlayerBucket(source, bucket)
    local id, number = playerId(source), tonumber(bucket)
    if not id or not number or math.type(number) ~= 'integer' or number < 0 then return false end
    ---@cast number integer
    warnBucket(number)
    Player(id).state:set('instance', number, true)
    SetPlayerRoutingBucket(tostring(id), number)
    local license = Bridge.license(id)
    if license then QBCore.Player_Buckets[license] = { id = id, bucket = number } end
    return true
end

---@param entity integer
---@param bucket integer
---@return boolean
function QBCore.Functions.SetEntityBucket(entity, bucket)
    local number = tonumber(bucket)
    if type(entity) ~= 'number' or not number or math.type(number) ~= 'integer' or number < 0 or not DoesEntityExist(entity) then return false end
    ---@cast number integer
    warnBucket(number)
    SetEntityRoutingBucket(entity, number)
    QBCore.Entity_Buckets[entity] = { id = entity, bucket = number }
    return true
end

---@param bucket integer
---@return integer[]
function QBCore.Functions.GetPlayersInBucket(bucket)
    local out = {}
    for _, entry in pairs(QBCore.Player_Buckets) do
        if entry.bucket == bucket then out[#out + 1] = entry.id end
    end
    return out
end

---@param bucket integer
---@return integer[]
function QBCore.Functions.GetEntitiesInBucket(bucket)
    local out = {}
    for _, entry in pairs(QBCore.Entity_Buckets) do
        if entry.bucket == bucket then out[#out + 1] = entry.id end
    end
    return out
end

AddEventHandler('entityRemoved', function(entity)
    QBCore.Entity_Buckets[entity] = nil
end)

--------------------------------------------------------------------------------------------------------------------
-- Vehicles (created on the server through ai-lib's `spawnVehicle`)
--------------------------------------------------------------------------------------------------------------------

---@param source? integer
---@param model string|integer
---@param coords? vector3|vector4|table
---@param warp? boolean
---@param kind? string the CreateVehicleServerSetter type; nil asks the player's client
---@param keys? boolean gives the player temporary keys
---@return integer vehicle the vehicle (0 when it could not be created)
local function spawn(source, model, coords, warp, kind, keys)
    if type(model) == 'number' then
        local entry = QBCore.Shared.VehicleHashes[model]
        model = entry and entry.model
    end
    if type(model) ~= 'string' or not model:match('^[%w_]+$') then return 0 end
    local id = playerId(source)
    local position
    if coords ~= nil then
        local at = vec3(coords)
        if not at then return 0 end
        local heading = coords.w
        if type(coords) == 'table' then heading = heading or coords.heading or coords.h end
        position = { x = at.x, y = at.y, z = at.z, w = tonumber(heading) or 0.0 }
    else
        local ped = id and GetPlayerPed(id) or 0
        if ped == 0 then return 0 end
        local at = GetEntityCoords(ped)
        position = { x = at.x, y = at.y, z = at.z, w = GetEntityHeading(ped) }
    end
    local vehicle = aiLib.spawnVehicle({
        model = model,
        coords = position,
        asker = kind == nil and id or nil,
        type = kind,
        driver = warp and id or nil,
        keysTo = keys and id or nil,
        purpose = keys and 'temporary' or nil,
    })
    return vehicle or 0
end

--- qb-core's server vehicle (the type asked from the player's client).
---@param source integer
---@param model string|integer
---@param coords? vector3|vector4
---@param warp? boolean
---@return integer
function QBCore.Functions.SpawnVehicle(source, model, coords, warp)
    return spawn(source, model, coords, warp, nil, false)
end

---@param source integer
---@param model string|integer
---@param coords? vector3|vector4
---@param warp? boolean
---@return integer
function QBCore.Functions.CreateAutomobile(source, model, coords, warp)
    return spawn(source, model, coords, warp, 'automobile', false)
end

---@param source integer
---@param model string|integer
---@param vehtype string automobile, bike, boat, heli, plane, submarine, trailer or train
---@param coords? vector3|vector4
---@param warp? boolean
---@return integer
function QBCore.Functions.CreateVehicle(source, model, vehtype, coords, warp)
    return spawn(source, model, coords, warp, type(vehtype) == 'string' and vehtype or 'automobile', false)
end

-- qb-core's own vehicle callbacks (its admin `/car`): ai-core admins only; the spawned car's keys go to the admin.
for name, kind in pairs({ ['QBCore:Server:SpawnVehicle'] = false, ['QBCore:Server:CreateVehicle'] = 'automobile' }) do
    QBCore.Functions.CreateCallback(name, function(source, cb, model, coords, warp)
        if not Bridge.isAdmin(source) or type(model) ~= 'string' or (coords ~= nil and not vec3(coords)) then return cb(nil) end
        local vehicle = spawn(source, model, coords, warp == true, kind or nil, true)
        cb(vehicle ~= 0 and DoesEntityExist(vehicle) and NetworkGetNetworkIdFromEntity(vehicle) or nil)
    end)
end

--------------------------------------------------------------------------------------------------------------------
-- Client callbacks (qb-core's event names; the client half is bridge/qb/client.lua)
--------------------------------------------------------------------------------------------------------------------

local CLIENT_CALLBACK_TIMEOUT = 30000

--- Asks a player's client callback (`QBCore.Functions.CreateClientCallback` there): `cb(...)` when the first extra
--- argument is a function, else waits and returns the first answer (nil after 30 s).
---@param name string
---@param source integer
---@param ... any
---@return any
function QBCore.Functions.TriggerClientCallback(name, source, ...)
    local id = playerId(source)
    if type(name) ~= 'string' or not id then return end
    local args = table.pack(...)
    local cb
    local first = 1
    if BridgeQB.isCallable(args[1]) then
        cb = args[1]
        first = 2
    end
    local key = name .. id
    local entry = { callback = cb, promise = promise.new() }
    QBCore.ClientCallbacks[key] = entry
    SetTimeout(CLIENT_CALLBACK_TIMEOUT, function()
        if QBCore.ClientCallbacks[key] ~= entry then return end
        QBCore.ClientCallbacks[key] = nil
        entry.promise:resolve(nil)
    end)
    TriggerClientEvent('QBCore:Client:TriggerClientCallback', id, name, table.unpack(args, first, args.n))
    if cb == nil then return Citizen.Await(entry.promise) end
end

RegisterNetEvent('QBCore:Server:TriggerClientCallback', function(name, ...)
    local src = source
    if type(name) ~= 'string' then return end
    local key = name .. src
    local entry = QBCore.ClientCallbacks[key]
    -- Only a request this player was asked can be answered.
    if not entry or not Bridge.allow(src) then return end
    QBCore.ClientCallbacks[key] = nil
    entry.promise:resolve((...))
    if entry.callback then entry.callback(...) end
end)

--------------------------------------------------------------------------------------------------------------------
-- Items
--------------------------------------------------------------------------------------------------------------------

--- Runs the registered use handler of an item for a player (qb-core forwards to qb-inventory's `UseItem`).
---@param source integer
---@param item string|table the item name or a QB item table
function QBCore.Functions.UseItem(source, item)
    local id = playerId(source)
    local name = type(item) == 'table' and item.name or item
    if not id or type(name) ~= 'string' then return end
    return Bridge.useItem(id, name, type(item) == 'table' and item or nil)
end

--------------------------------------------------------------------------------------------------------------------
-- Permissions (QB levels god / admin / mod are ai-core admins, ace `ai.admin`; QB-style aces still count)
--------------------------------------------------------------------------------------------------------------------

local QB_LEVELS = { god = true, admin = true, mod = true }

-- qb-core's aces: principal `qbcore.<level>` holds ace `<level>`.
CreateThread(function()
    for _, level in ipairs(QBCore.Config.Server.Permissions) do
        ExecuteCommand(('add_ace qbcore.%s %s allow'):format(level, level))
    end
end)

---@param source integer
---@param permission string
---@return boolean
local function allowed(source, permission)
    if type(permission) ~= 'string' then return false end
    if IsPlayerAceAllowed(tostring(source), permission) then return true end
    return QB_LEVELS[permission:lower()] == true and Bridge.isAdmin(tonumber(source) or 0)
end

---@param source integer
---@param permission string|string[]
---@return boolean
function QBCore.Functions.HasPermission(source, permission)
    if type(permission) == 'table' then
        for _, level in pairs(permission) do
            if allowed(source, level) then return true end
        end
        return false
    end
    return allowed(source, permission)
end

---@param source integer
---@return table<string, boolean>
function QBCore.Functions.GetPermission(source)
    local out = {}
    for _, level in ipairs(QBCore.Config.Server.Permissions) do
        if allowed(source, level) then out[level] = true end
    end
    return out
end

--- QB levels a player got with AddPermission (removed again when they leave: `player.<id>` is reused).
---@type table<integer, table<string, true>>
local granted = {}

---@param permission any
---@return string|nil
local function level(permission)
    if type(permission) ~= 'string' then return nil end
    permission = permission:lower()
    return permission:match('^[%w_%-]+$') and permission or nil
end

---@param source integer
---@param permission string
function QBCore.Functions.AddPermission(source, permission)
    local id, name = playerId(source), level(permission)
    if not id or not name or allowed(id, name) then return end
    ExecuteCommand(('add_principal player.%d qbcore.%s'):format(id, name))
    granted[id] = granted[id] or {}
    granted[id][name] = true
    QBCore.Commands.Refresh(id)
end

---@param source integer
---@param permission? string every QB level when left out
function QBCore.Functions.RemovePermission(source, permission)
    local id = playerId(source)
    if not id then return end
    local names = permission ~= nil and { level(permission) } or QBCore.Config.Server.Permissions
    for _, name in ipairs(names) do
        if granted[id] and granted[id][name] then
            ExecuteCommand(('remove_principal player.%d qbcore.%s'):format(id, name))
            granted[id][name] = nil
        end
    end
    QBCore.Commands.Refresh(id)
end

--- Admin message opt-in, admins only like qb-core; kept in ai-core metadata `optin` (absent = in), shared with the Qbox
--- exports, so it survives a reconnect.
---@param source integer
---@return boolean
function QBCore.Functions.IsOptin(source)
    local mirror = Bridge.players[tonumber(source) or -1]
    if not mirror or not QBCore.Functions.HasPermission(source, 'admin') then return false end
    return mirror.metadata.optin ~= false
end

---@param source integer
function QBCore.Functions.ToggleOptin(source)
    local mirror = Bridge.players[tonumber(source) or -1]
    if not mirror or not QBCore.Functions.HasPermission(source, 'admin') then return end
    local optin = mirror.metadata.optin == false
    Bridge.core:SetMeta(mirror.source, 'optin', optin)
    local player = getPlayer(source)
    if player then player.PlayerData.optin = optin end
    TriggerEvent('QBCore:Server:OnPlayerUpdated', source, 'optin', optin)
end

--- ai-core has no ban list of its own (ban scripts refuse joins through ai-core's connection checks).
---@return boolean, string?
function QBCore.Functions.IsPlayerBanned() return false end

---@param source integer
---@return boolean
function QBCore.Functions.IsWhitelisted(source)
    if not QBCore.Config.Server.Whitelist then return true end
    return QBCore.Functions.HasPermission(source, QBCore.Config.Server.WhitelistPermission)
end

---@param license string
---@return boolean
function QBCore.Functions.IsLicenseInUse(license)
    for _, id in ipairs(GetPlayers()) do
        if GetPlayerIdentifierByType(id, 'license') == license then return true end
    end
    return false
end

---@param source integer
---@param reason string
---@param setKickReason? function
---@param deferrals? table
function QBCore.Functions.Kick(source, reason, setKickReason, deferrals)
    reason = tostring(reason or '')
    if setKickReason then setKickReason(reason) end
    CreateThread(function()
        if deferrals then
            deferrals.update(reason)
            Wait(2500)
        end
        local id = playerId(source)
        if id and GetPlayerPing(tostring(id)) >= 0 then DropPlayer(tostring(id), reason) end
    end)
end

--------------------------------------------------------------------------------------------------------------------
-- Core info
--------------------------------------------------------------------------------------------------------------------

--- The qb-core version whose API the bridge answers.
---@return string
function QBCore.Functions.GetCoreVersion() return '1.3.0' end

--- qb-core's database info from the `mysql_connection_string` convar (only the database name).
---@return { exists: boolean, database: string }
function QBCore.Functions.GetDatabaseInfo()
    local details = { exists = false, database = '' }
    local connection = GetConvar('mysql_connection_string', '')
    if connection == '' then return details end
    if connection:find('mysql://') then
        local rest = connection:sub(9, -1)
        details.database = (rest:sub((rest:find('/') or #rest) + 1, -1):gsub('[%?]+[%w%p]*$', ''))
        details.exists = details.database ~= ''
        return details
    end
    for part in connection:gmatch('[^;]+') do
        local name = part:match('^%s*[Dd]atabase%s*=%s*(.-)%s*$')
        if name then
            details.database, details.exists = name, true
            return details
        end
    end
    return details
end

--------------------------------------------------------------------------------------------------------------------
-- Shared registries: jobs, gangs and items scripts add at runtime (ai-core's own come from its panel / inventory)
--------------------------------------------------------------------------------------------------------------------

local added = BridgeQB.added

---@param tableName 'Jobs'|'Gangs'|'Items'
---@param name string
---@return 'own'|'panel'|nil 'own' = added by a script, 'panel' = ai-core's
local function owner(tableName, name)
    if added[tableName][name] ~= nil then return 'own' end
    if tableName == 'Jobs' and Bridge.jobDefinitions()[name] then return 'panel' end
    if tableName == 'Gangs' and Bridge.gangDefinitions()[name] then return 'panel' end
    if tableName == 'Items' and Bridge.itemDefinition(name) then return 'panel' end
    return nil
end

---@param tableName 'Jobs'|'Gangs'|'Items'
---@param name string|nil
---@param value any
local function sharedChanged(tableName, name, value)
    if name then
        TriggerClientEvent('QBCore:Client:OnSharedUpdate', -1, tableName, name, value)
    else
        TriggerClientEvent('QBCore:Client:OnSharedUpdateMultiple', -1, tableName, value)
    end
    TriggerEvent('QBCore:Server:UpdateObject')
end

---@param tableName 'Jobs'|'Gangs'|'Items'
---@param kind string 'job' | 'gang' | 'item'
local function registry(tableName, kind)
    local invalid, exists, missing = ('invalid_%s_name'):format(kind), ('%s_exists'):format(kind), ('%s_not_exists'):format(kind)
    local function add(name, value)
        if type(name) ~= 'string' then return false, invalid end
        if owner(tableName, name) then return false, exists end
        added[tableName][name] = value
        sharedChanged(tableName, name, value)
        return true, 'success'
    end
    local function addMany(values)
        if type(values) ~= 'table' then return false, invalid end
        for name, value in pairs(values) do
            if type(name) ~= 'string' then return false, invalid, value end
            if owner(tableName, name) then return false, exists, value end
        end
        for name, value in pairs(values) do added[tableName][name] = value end
        sharedChanged(tableName, nil, values)
        return true, 'success', nil
    end
    -- ai-core's own jobs, gangs and items are changed in the panel / the inventory, never by a script.
    local function update(name, value)
        if type(name) ~= 'string' then return false, invalid end
        local who = owner(tableName, name)
        if who ~= 'own' then return false, who == 'panel' and ('%s_managed_by_ai_core'):format(kind) or missing end
        added[tableName][name] = value
        sharedChanged(tableName, name, value)
        return true, 'success'
    end
    local function remove(name)
        if type(name) ~= 'string' then return false, invalid end
        local who = owner(tableName, name)
        if who ~= 'own' then return false, who == 'panel' and ('%s_managed_by_ai_core'):format(kind) or missing end
        added[tableName][name] = nil
        sharedChanged(tableName, name, nil)
        return true, 'success'
    end
    return add, addMany, update, remove
end

QBCore.Functions.AddJob, QBCore.Functions.AddJobs, QBCore.Functions.UpdateJob, QBCore.Functions.RemoveJob = registry('Jobs', 'job')
QBCore.Functions.AddGang, QBCore.Functions.AddGangs, QBCore.Functions.UpdateGang, QBCore.Functions.RemoveGang = registry('Gangs', 'gang')
QBCore.Functions.AddItem, QBCore.Functions.AddItems, QBCore.Functions.UpdateItem, QBCore.Functions.RemoveItem = registry('Items', 'item')

--- Adds a function to QBCore.Functions (never replaces one).
---@param methodName string
---@param handler function
---@return boolean, string
function QBCore.Functions.SetMethod(methodName, handler)
    if type(methodName) ~= 'string' then return false, 'invalid_method_name' end
    if QBCore.Functions[methodName] ~= nil then return false, 'method_exists' end
    QBCore.Functions[methodName] = handler
    TriggerEvent('QBCore:Server:UpdateObject')
    return true, 'success'
end

--- Adds a field to QBCore (never replaces one).
---@param fieldName string
---@param data any
---@return boolean, string
function QBCore.Functions.SetField(fieldName, data)
    if type(fieldName) ~= 'string' then return false, 'invalid_field_name' end
    if QBCore[fieldName] ~= nil then return false, 'field_exists' end
    QBCore[fieldName] = data
    TriggerEvent('QBCore:Server:UpdateObject')
    return true, 'success'
end

-- A loading player's client gets the item definitions (and the jobs / gangs scripts added) once; the client half
-- keeps ai-core's own jobs and gangs from ai-core's definitions channel.
local LATENT_BPS = 200000

Bridge.on('loaded', function(source)
    local items = BridgeQB.sharedItems()
    if next(items) then TriggerLatentClientEvent('QBCore:Client:OnSharedUpdateMultiple', source, LATENT_BPS, 'Items', items) end
    if next(added.Jobs) then TriggerLatentClientEvent('QBCore:Client:OnSharedUpdateMultiple', source, LATENT_BPS, 'Jobs', added.Jobs) end
    if next(added.Gangs) then TriggerLatentClientEvent('QBCore:Client:OnSharedUpdateMultiple', source, LATENT_BPS, 'Gangs', added.Gangs) end
end)

-- Another inventory became active: its item definitions replace the old ones on the loaded players' clients.
AddEventHandler('ai-core:inventoryChanged', function()
    if not next(Bridge.players) then return end
    local items = BridgeQB.sharedItems()
    if next(items) then TriggerLatentClientEvent('QBCore:Client:OnSharedUpdateMultiple', -1, LATENT_BPS, 'Items', items) end
    TriggerEvent('QBCore:Server:UpdateObject')
end)

--------------------------------------------------------------------------------------------------------------------
-- Commands (through ai-lib's `addCommand`: QB levels are ai-core admins, `user` is everyone)
--------------------------------------------------------------------------------------------------------------------

local t ---@type fun(key: string, ...: string|number): string

---@param source integer
---@param text string
local function reply(source, text)
    if source > 0 then Bridge.notify(source, text, 'error') else print(text) end
end

---@param source integer
---@param entry { name: string, permission: string|string[] }
---@return boolean
local function mayUse(source, entry)
    local permissions = type(entry.permission) == 'table' and entry.permission or { entry.permission }
    for _, permission in ipairs(permissions) do
        if permission == 'user' then return true end
    end
    return Bridge.isAdmin(source) or IsPlayerAceAllowed(tostring(source), 'command.' .. entry.name) or QBCore.Functions.HasPermission(source, permissions)
end

---@param name string
---@param help string
---@param arguments? { name: string, help: string }[]
---@param argsrequired? boolean
---@param callback fun(source: integer, args: string[], rawCommand: string)
---@param permission? string
---@param ... string more permission levels
function QBCore.Commands.Add(name, help, arguments, argsrequired, callback, permission, ...)
    if type(name) ~= 'string' or not name:match('^[%w_%-%.]+$') then return end
    arguments = type(arguments) == 'table' and arguments or {}
    local permissions = { type(permission) == 'string' and permission:lower() or 'user' }
    for _, extra in ipairs({ ... }) do
        if type(extra) == 'string' then permissions[#permissions + 1] = extra:lower() end
    end
    local restricted = permissions[1] ~= 'user'
    local aces = { 'ai.admin' }
    for _, level2 in ipairs(permissions) do
        if not QBCore.Commands.IgnoreList[level2] and level2:match('^[%w_%-]+$') then
            aces[#aces + 1] = level2
            ExecuteCommand(('add_ace qbcore.%s command.%s allow'):format(level2, name))
        end
    end
    aiLib.addCommand(name, { help = help, restricted = restricted and aces or false }, function(source, _, raw)
        local args = Bridge.words(raw)
        if argsrequired and #args < #arguments then
            t = t or aiLib.locale('ai-core')
            local missing = arguments[#args + 1]
            return reply(source, t('COMMAND_MISSING', type(missing) == 'table' and tostring(missing.name) or '?'))
        end
        TriggerEvent('QBCore:Server:PreCommandExecution', source, name, args, raw)
        if WasEventCanceled() then return end
        callback(source, args, raw)
    end)
    QBCore.Commands.List[name:lower()] = {
        name = name:lower(),
        permission = #permissions == 1 and permissions[1] or permissions,
        help = help,
        arguments = arguments,
        argsrequired = argsrequired == true,
        callback = callback,
    }
end

--- Sends a player the chat suggestions of the QB commands they may use and removes the others.
---@param source integer
function QBCore.Commands.Refresh(source)
    local id = playerId(source)
    if not id or not Bridge.players[id] then return end
    local suggestions = {}
    for command, entry in pairs(QBCore.Commands.List) do
        if mayUse(id, entry) then
            suggestions[#suggestions + 1] = { name = '/' .. command, help = entry.help, params = entry.arguments }
        else
            TriggerClientEvent('chat:removeSuggestion', id, '/' .. command)
        end
    end
    TriggerClientEvent('chat:addSuggestions', id, suggestions)
end

--------------------------------------------------------------------------------------------------------------------
-- Net events (client values are checked; every one goes through the bridge's rate gate)
--------------------------------------------------------------------------------------------------------------------

---@param src integer
---@return QBPlayer|nil
local function caller(src)
    if not Bridge.players[src] or not Bridge.allow(src) then return nil end
    return getPlayer(src)
end

-- qb-core's duty toggle (duty points, job menus).
RegisterNetEvent('QBCore:ToggleDuty', function()
    local src = source
    local player = caller(src)
    if not player then return end
    local job = player.PlayerData.job
    core:SetDuty(src, (not job.onduty) and job.name or nil)
end)

-- qb-adminmenu style command calls without the chat.
RegisterNetEvent('QBCore:CallCommand', function(command, args)
    local src = source
    if type(command) ~= 'string' then return end
    local entry = QBCore.Commands.List[command:lower()]
    if not entry or not caller(src) or not mayUse(src, entry) then return end
    local words = {}
    if type(args) == 'table' then
        for i = 1, math.min(#args, 32) do words[i] = tostring(args[i]) end
    end
    if entry.argsrequired and #entry.arguments ~= 0 and not words[#entry.arguments] then return end
    entry.callback(src, words, '/' .. command .. ' ' .. table.concat(words, ' '))
end)

-- Closing the server to everyone without qb-core's `qbadmin.join` ace (or ai-core admin): joins are refused through
-- ai-core's connection gate, connected players without the whitelist level are kicked.
RegisterNetEvent('QBCore:Server:CloseServer', function(reason)
    local src = source
    if not Bridge.allow(src) or not QBCore.Functions.HasPermission(src, 'admin') then return end
    QBCore.Config.Server.Closed = true
    QBCore.Config.Server.ClosedReason = type(reason) == 'string' and reason:sub(1, 200) or 'No reason specified'
    for id in pairs(QBCore.Players) do
        if not QBCore.Functions.HasPermission(id, QBCore.Config.Server.WhitelistPermission) then
            QBCore.Functions.Kick(id, QBCore.Config.Server.ClosedReason)
        end
    end
end)

RegisterNetEvent('QBCore:Server:OpenServer', function()
    local src = source
    if not Bridge.allow(src) or not QBCore.Functions.HasPermission(src, 'admin') then return end
    QBCore.Config.Server.Closed = false
end)

CreateThread(function()
    core:AddConnectionCheck('qb-core:closed', function(source)
        if not QBCore.Config.Server.Closed then return nil end
        local id = tostring(source)
        if IsPlayerAceAllowed(id, 'qbadmin.join') or IsPlayerAceAllowed(id, 'ai.admin') then return nil end
        return QBCore.Config.Server.ClosedReason
    end)
end)

-- Old qb-inventory: the client asks to use an item. The stack is read from the inventory, never taken from the client.
RegisterNetEvent('QBCore:Server:UseItem', function(item)
    local src = source
    local name = type(item) == 'table' and item.name or item
    if type(name) ~= 'string' or not caller(src) then return end
    local slot = type(item) == 'table' and tonumber(item.slot) or nil
    for _, stack in ipairs(core:GetItems(src) or {}) do
        if stack.name == name and (not slot or stack.slot == slot) then
            return Bridge.useItem(src, name, BridgeQB.qbStack(stack))
        end
    end
end)

-- Old scripts: the client takes its own items (never gives: `QBCore:Server:AddItem` is not answered).
RegisterNetEvent('QBCore:Server:RemoveItem', function(itemName, amount, slot)
    local src = source
    local count = tonumber(amount) or 1
    if type(itemName) ~= 'string' or count <= 0 or math.type(count) ~= 'integer' or not caller(src) then return end
    core:RemoveItem(src, itemName, count, nil, tonumber(slot))
end)

-- Old HUDs: the client reports its needs. Only a change that hurts the player is taken (less hunger / thirst, more
-- stress); anything else could be a cheat.
local SELF_REPORTED = { hunger = -1, thirst = -1, stress = 1 }
RegisterNetEvent('QBCore:Server:SetMetaData', function(key, value)
    local src = source
    local direction = SELF_REPORTED[key]
    local number = tonumber(value)
    local player = direction and number and caller(src)
    if not player then return end
    local current = tonumber(player.PlayerData.metadata[key]) or 0
    number = math.min(100, math.max(0, number --[[@as number]]))
    if (number - current) * direction > 0 then core:SetMeta(src, key, number) end
end)

AddEventHandler('playerDropped', function()
    local src = source
    local license = Bridge.license(src)
    if license then QBCore.Player_Buckets[license] = nil end
    for name in pairs(granted[src] or {}) do ExecuteCommand(('remove_principal player.%d qbcore.%s'):format(src, name)) end
    granted[src] = nil
end)

AddEventHandler('onResourceStop', function(resource)
    for name, entry in pairs(QBCore.UsableItems) do
        if entry.resource == resource then QBCore.UsableItems[name] = nil end
    end
end)

--------------------------------------------------------------------------------------------------------------------
-- Exports: qb-core exports every QBCore.Functions function under its name, plus a few of QBCore.Player
--------------------------------------------------------------------------------------------------------------------

--- qb-core's anti-cheat ban: ai-core keeps no ban list, so the player is dropped and the reason logged.
---@param playerId2 integer
---@param origin string
local function exploitBan(playerId2, origin)
    local id = playerId(playerId2)
    if not id then return end
    aiLib.aiLog('bridge', ('exploit: %s'):format(tostring(origin)), { level = 'warn', source = id })
    DropPlayer(tostring(id), tostring(origin))
end

for name, fn in pairs(QBCore.Functions) do
    if type(fn) == 'function' then Bridge.provideExport('qb-core', name, fn) end
end
Bridge.provideExport('qb-core', 'GetOfflinePlayerByLicense', QBCore.Player.GetOfflinePlayerByLicense)
Bridge.provideExport('qb-core', 'ExploitBan', exploitBan)
