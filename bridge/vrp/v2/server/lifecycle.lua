-- vRP 2 / 3 users and lifecycle on ai-core: users made at load, the character and player events, saves, and
-- `vRP.loadScript` (the "vRP" proxy). Loaded after every core extension file.

local V = BridgeVRP2
local vRP = V.vRP
local core = Bridge.core
local stored, saveUser, loadTable, cdataView = V.stored, V.saveUser, V.loadTable, V.cdataView
local coreMixins, scriptUserExts, userMeta = V.coreMixins, V.scriptUserExts, V.userMeta
local v1 = V.v1
local rebuildUser, constructFor, onExtension, identityOf = V.rebuildUser, V.constructFor, V.userExtension, V.identityOf

rebuildUser()
V.onExtension = onExtension

-- Users and lifecycle -------------------------------------------------------------------------------------------------

---@param source integer
---@param id integer
---@return table
local function newUser(source, id)
    local user = setmetatable({
        source = source, id = id, name = vRP.getPlayerName(source), endpoint = '0.0.0.0', spawns = 0,
        data = {}, loading_character = false,
    }, userMeta)
    for _, mixin in ipairs(coreMixins) do
        if mixin.construct then mixin.construct(user) end
    end
    for _, ext in ipairs(scriptUserExts) do constructFor(ext, user) end
    vRP.users[id] = user
    vRP.users_by_source[source] = user
    local data, packed = loadTable('u', id)
    user.data = data
    stored[user] = { u = packed }
    return user
end

--- characterUnload (waits for the listeners), then the character's data is written.
---@param user table
local function unloadCharacter(user)
    if not user.cid then return end
    vRP:triggerEventSync('characterUnload', user)
    saveUser(user)
    vRP.users_by_cid[user.cid] = nil
    user.cid = nil
end

Bridge.on('loaded', function(source)
    local cid = BridgeVRP.userId(source)
    if not cid then return end
    CreateThread(function()
        local user = vRP.users_by_source[source]
        local joined = false
        if not user then
            local id = tonumber(core:GetUserId(source))
            if not id then return end
            user = newUser(source, id)
            joined = true
        end
        if user.cid == cid then return end
        unloadCharacter(user)
        if BridgeVRP.userId(source) ~= cid then return end
        user.cid = cid
        user.loading_character = true
        vRP.users_by_cid[cid] = user
        local raw, packed = loadTable('c', cid)
        user.cdata = cdataView(user, raw)
        stored[user].c = packed
        user.data.current_character = cid
        user.identity = identityOf(cid, v1('getUserIdentity', nil, cid))
        vRP:triggerEventSync('characterLoad', user)
        user.loading_character = false
        if joined then vRP:triggerEvent('playerJoin', user) end
    end)
end)

Bridge.on('unloaded', function(source)
    local user = vRP.users_by_source[source]
    if user then unloadCharacter(user) end
end)

AddEventHandler('playerDropped', function(reason)
    local source = tonumber(source) --[[@as integer]]
    local user = vRP.users_by_source[source]
    if not user then return end
    unloadCharacter(user)
    vRP:triggerEventSync('playerLeave', user, reason)
    saveUser(user)
    vRP.users[user.id] = nil
    vRP.users_by_source[source] = nil
end)

-- `playerSpawn(user, first_spawn)` 2 s after ai-core spawned the character (as vRP); first = first of this connection.
AddEventHandler('ai-core:playerSpawned', function(source, charId)
    if GetInvokingResource() and GetInvokingResource() ~= 'ai-core' then return end
    local user = vRP.users_by_source[source]
    if not user then return end
    user.spawns = user.spawns + 1
    local first = user.spawns == 1
    SetTimeout(2000, function()
        if vRP.users_by_source[source] == user and user.cid == charId then vRP:triggerEvent('playerSpawn', user, first) end
    end)
end)

AddEventHandler('ai-core:playerDied', function(source)
    if GetInvokingResource() and GetInvokingResource() ~= 'ai-core' then return end
    local user = vRP.users_by_source[source]
    if user and user.cid then vRP:triggerEvent('playerDeath', user) end
end)

Bridge.on('money', function(source, account)
    local user = vRP.users_by_source[source]
    if user and user.cid and (account == 'cash' or account == 'bank') then vRP:triggerEvent('playerMoneyUpdate', user) end
end)

local vitalOf = { hunger = 'food', thirst = 'water' }
Bridge.on('meta', function(source, key)
    local vital = vitalOf[key]
    local user = vital and vRP.users_by_source[source]
    if user and user.cid then vRP:triggerEvent('playerVitalChange', user, vital) end
end)

---@param event string
---@param user_id any
---@param group any
---@param gtype any
local function groupEvent(event, user_id, group, gtype)
    if GetInvokingResource() and GetInvokingResource() ~= 'ai-core' then return end
    local user = vRP.users_by_cid[tonumber(user_id) or -1]
    if user then vRP:triggerEvent(event, user, group, gtype) end
end
AddEventHandler('vRP:playerJoinGroup', function(...) groupEvent('playerJoinGroup', ...) end)
AddEventHandler('vRP:playerLeaveGroup', function(...) groupEvent('playerLeaveGroup', ...) end)

--- `save` event, then every user's data (vRP's `save_interval`).
function vRP:save()
    self:triggerEvent('save')
    for _, user in pairs(self.users) do saveUser(user) end
end

aiLib.every((tonumber(vRP.cfg.save_interval) or 60) * 1000, function() vRP:save() end)

AddEventHandler('onResourceStop', function(resource)
    if resource ~= GetCurrentResourceName() then return end
    for _, user in pairs(vRP.users) do saveUser(user) end
end)

-- loadScript ---------------------------------------------------------------------------------------------------------

--- vRP 2 / 3 `vRP.loadScript(resource, path)`: runs `<resource>/<path>.lua` in the vRP context (bridge/vrp/v2/shared/scripts.lua).
---@param resource any
---@param path any
function BridgeVRP.proxy.loadScript(resource, path)
    V.loadScript(resource, path, GetInvokingResource())
end
