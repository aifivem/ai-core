-- vRP 2 / 3 on ai-core, client side: `vRP.loadScript` (the client "vRP" proxy), the client `vRP` object extensions
-- loaded on the client see, and the core extensions (`vRP.EXT.Base:notify(...)` ...) as views of the vRP 1 client
-- functions (`BridgeVRPClient.tvRP`, whose names vRP 2's client modules share). The server's
-- `vRP.EXT.<core>.remote` is the vRP client tunnel, so the vRP 3 Base additions (`getHeading`, `notifyHelp`,
-- `clearHelp`) and the ids live on `tvRP` here. Folder note: bridge/vrp/CLAUDE.md.
-- vRP 2 `vrp/client/base.lua`, vRP 3 `vrp/client/base.lua` (https://github.com/vRP-framework/vRP,
-- https://github.com/vRP-framework/vRP3-Dev; MIT, Copyright (c) 2017 ImagicTheCat).

local V = BridgeVRP2
local vRP = V.vRP
local tvRP = BridgeVRPClient.tvRP

vRP.cfg = module('vrp', 'cfg/client')

--- A core extension: `ext:fn(...)` calls `tvRP.fn(...)` (looked up at call time); own methods set on the table win.
---@param name string
---@param own table
---@return table
local function coreExtension(name, own)
    own.remote = BridgeVRPClient.server
    local ext = setmetatable(own, {
        __index = function(_, key)
            local f = tvRP[key]
            if type(f) ~= 'function' then return nil end
            return function(_, ...) return f(...) end
        end,
    })
    V.addExtension(name, ext, nil, nil)
    return ext
end

local Base = coreExtension('Base', { players = {} })

---@param x any
---@param y any
---@param z any
---@param heading? any
function Base:teleport(x, y, z, heading)
    tvRP.teleport(x, y, z, heading)
    vRP:triggerEvent('playerTeleport')
end

for _, name in ipairs({ 'Survival', 'PlayerState', 'Map', 'GUI', 'Identity' }) do coreExtension(name, {}) end

-- Ids the server sends (vRP 2 `Base.tunnel.setUserId` / `setCharacterId`).
---@param id any
function tvRP.setUserId(id)
    Base.id = tonumber(id)
end

---@param id any
function tvRP.setCharacterId(id)
    Base.cid = tonumber(id)
end

--- vRP 3: an entity's heading (default the local ped).
---@param entity? integer
---@return number
function tvRP.getHeading(entity)
    return GetEntityHeading(entity or aiLib.cache.ped)
end

local HELP = 'vrp:help'
local HELP_HOLD_MS = 200
---@type string|nil
local helpText
local helpUntil, helpWatching = 0, false

--- vRP 3: help text (vRP draws it for one frame, scripts call it every frame): shown as ai-lib's prompt while calls
--- keep coming, hidden 200 ms after the last.
---@param msg any
function tvRP.notifyHelp(msg)
    local text = aiLib.stripGameText(msg)
    if text ~= helpText then
        helpText = text
        aiLib.showPrompt(HELP, text)
    end
    helpUntil = GetGameTimer() + HELP_HOLD_MS
    if helpWatching then return end
    helpWatching = true
    CreateThread(function()
        while GetGameTimer() < helpUntil and helpText do Wait(100) end
        helpWatching = false
        tvRP.clearHelp()
    end)
end

--- vRP 3: hides the help text.
function tvRP.clearHelp()
    if not helpText then return end
    helpText = nil
    aiLib.hidePrompt(HELP)
end

-- Client events of vRP 2: `playerSpawn` after each spawn ai-core makes, `playerDeath` when the player goes down.
AddEventHandler('ai-core:client:playerLoaded', function()
    vRP:triggerEvent('playerSpawn')
end)

AddEventHandler('ai-core:client:dead', function(dead)
    if dead == true then vRP:triggerEvent('playerDeath') end
end)

--- vRP 2 / 3 client `vRP.loadScript(resource, path)`: runs `<resource>/<path>.lua` (in the resource's `files`) in the
--- client vRP context (bridge/vrp/v2/shared/scripts.lua).
---@param resource any
---@param path any
function tvRP.loadScript(resource, path)
    V.loadScript(resource, path, GetInvokingResource())
end
