-- ai-core's framework bridge, client side: creates `BridgeClient` (the player's mirror state and the namespace the
-- other files under bridge/core/client/ add to), the change listeners, export answering, every framework's notify
-- and the closest entity lookup. The mirror is built in mirror.lua from ai-core's own player data channel.

---@class BridgeClientState
---@field loaded boolean
---@field external boolean the character was loaded by an external character screen (it fires its own load events)
---@field character table|nil
---@field money table<string, number>
---@field job table|nil
---@field gang table|nil
---@field metadata table<string, any>
---@field license string|nil
---@field name string|nil

---@type BridgeClientState
BridgeClient = { loaded = false, external = false, character = nil, money = {}, job = nil, gang = nil, metadata = {}, license = nil, name = nil }

--- 'loaded' (data: AiPlayerData, external: boolean): the character's data is in; 'spawned': it stands in the world.
---@alias BridgeClientChange 'loaded'|'spawned'|'unloaded'|'money'|'job'|'gang'|'meta'

---@type table<string, fun(...)[]>
local listeners = { loaded = {}, spawned = {}, unloaded = {}, money = {}, job = {}, gang = {}, meta = {} }

---@param kind BridgeClientChange
---@param fn fun(...)
function BridgeClient.on(kind, fn)
    listeners[kind][#listeners[kind] + 1] = fn
end

---@param kind BridgeClientChange
local function emitChange(kind, ...)
    for i = 1, #listeners[kind] do
        local ok, err = pcall(listeners[kind][i], ...)
        if not ok then print(('^1[ai-core bridge] %s handler failed: %s^0'):format(kind, err)) end
    end
end

--- Answers `exports[name]:export(...)` for a name ai-core provides.
---@param name string
---@param export string
---@param fn function
function BridgeClient.provideExport(name, export, fn)
    AddEventHandler(('__cfx_export_%s_%s'):format(name, export), function(setCB)
        setCB(fn)
    end)
end

local kinds = { primary = 'info', inform = 'info', info = 'info', success = 'success', error = 'error', warning = 'warning' }

--- Every framework's notify: QB's `{ text, caption }` table shows `text` as the title over `caption`.
---@param text string|{ text?: string, caption?: string }
---@param kind? string
---@param duration? integer
---@param title? string
function BridgeClient.notify(text, kind, duration, title)
    if type(text) == 'table' then
        if text.caption then
            title, text = text.text, text.caption
        else
            text = text.text
        end
    end
    aiLib.notify(tostring(text or ''), kinds[kind or 'info'] or 'info', tonumber(duration), title and tostring(title) or nil)
end

--- The closest ped / object / vehicle to `coords` (default the local ped; peds skip it) that passes `filter`, in ESX's
--- and QB's shape: the entity and its distance, -1, -1 when none.
---@param kind 'ped'|'object'|'vehicle'
---@param coords? vector3|vector4|table
---@param filter? fun(entity: integer): boolean
---@return integer, number
function BridgeClient.closest(kind, coords, filter)
    local entity, distance = aiLib.nearestEntity(kind, coords, nil, { filter = filter })
    if entity == 0 then return -1, -1 end
    return entity, distance --[[@as number]]
end
BridgeClient.emit = emitChange

-- Framework notify events other scripts send to this client.
RegisterNetEvent('QBCore:Notify', function(text, kind, length) BridgeClient.notify(text, kind, length) end)
RegisterNetEvent('esx:showNotification', function(text, kind, length, title) BridgeClient.notify(text, kind, length, title) end)
