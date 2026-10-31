-- vRP's Tunnel on ai-core: calls between the server and clients over net events, vRP's own wire format:
--   request  '<iface>:tunnel_req' (member, args, identifier, rid)    server -> client: TriggerClientEvent(..., dest, ...)
--   answer   '<iface>:<identifier>:tunnel_res' (rid, rets)           rid -1 = no answer wanted (also for dest -1)
-- `args` / `rets` are packed lists (`n`, vRP 2/3) or plain lists (vRP 1.0): both are read. A server call takes the
-- player first (`-1` = everyone, never answered). Per destination delays (`Tunnel.setDestDelay`) as in vRP.
-- vRP 0.5 style: server `iface.member(dest, { args... }[, cb])`, client `iface.member({ args... }[, cb])`; the
-- callback gets the answer, nothing waits. The style is shared with lib/Proxy.lua.
-- Hardening over vRP: a server-side answer counts only from the player it was asked of, the requests of a player
-- who drops are answered with nothing, and a bound function that errors still answers.
-- Based on vRP 1.0 / 2 lib/Tunnel.lua (https://github.com/vRP-framework/vRP, MIT, Copyright (c) 2017 ImagicTheCat).

local Tools = module('vrp', 'lib/Tools')
local Proxy = module('vrp', 'lib/Proxy')

local TriggerRemoteEvent = SERVER and TriggerClientEvent or TriggerServerEvent
local RegisterLocalEvent = RegisterNetEvent

--- vRP 0.5: set while a bound function runs; calling it answers later through the returned function.
---@type (fun(): fun(rets?: table))|nil
TUNNEL_DELAYED = nil

---@class VrpTunnelModule
local Tunnel = {}

---@type table<integer, integer[]> dest -> { base delay, pending delay } in ms
Tunnel.delays = {}

--- The base delay between requests to a player (0 = at once).
---@param dest integer
---@param delay integer milliseconds
function Tunnel.setDestDelay(dest, delay)
    Tunnel.delays[dest] = { delay, 0 }
end

local unpackRets = Proxy.unpack

--- Client functions of the "vRP" tunnel that run on ai-core's server instead (weapons are inventory items, owner
--- decision): a server call `vRPclient.giveWeapons(source, ...)` becomes the proxy call `vRP.giveWeapons(source, ...)`.
---@type table<string, true>
Tunnel.serverMembers = { getWeapons = true, giveWeapons = true, replaceWeapons = true }

---@type table|nil the "vRP" proxy for routed members (own identifier: answers never mix with the script's own proxy)
local routedProxy

--- A server call of a routed member (`dest` first, 1.0 or 0.5 style), answered by ai-core's server proxy.
---@param fname string
---@param noWait boolean
---@return function
local function routed(fname, noWait)
    return function(dest, ...)
        routedProxy = routedProxy or Proxy.getInterface('vRP', GetCurrentResourceName() .. ':tunnel')
        local n = select('#', ...)
        local first, second = ...
        local args, cb
        if (n == 1 or n == 2) and Proxy.isArray(first) and (type(second) == 'function'
                or (second == nil and Proxy.style ~= '1.0')) then
            args, cb = table.pack(dest, table.unpack(first, 1, #first)), second
        else
            args = table.pack(dest, ...)
        end
        if cb then
            Citizen.CreateThreadNow(function() cb(routedProxy[fname](table.unpack(args, 1, args.n))) end)
            return
        end
        if noWait then
            routedProxy['_' .. fname](table.unpack(args, 1, args.n))
            return
        end
        return routedProxy[fname](table.unpack(args, 1, args.n))
    end
end

---@param mtable table
---@param dest integer|nil
---@param fname string
---@param args table packed
---@param callback fun(rets: table)|nil
local function send(mtable, dest, fname, args, callback)
    local rid = -1
    if callback then
        rid = mtable.ids:gen()
        mtable.callbacks[rid] = callback
        if dest then mtable.dests[rid] = dest end
    end
    if SERVER then
        TriggerRemoteEvent(mtable.name .. ':tunnel_req', dest --[[@as integer]], fname, args, mtable.identifier, rid)
    else
        TriggerRemoteEvent(mtable.name .. ':tunnel_req', fname, args, mtable.identifier, rid)
    end
end

---@param mtable table
---@param dest integer|nil
---@param fname string
---@param args table packed
---@param callback fun(rets: table)|nil
local function delayed(mtable, dest, fname, args, callback)
    local delay = dest and Tunnel.delays[dest] or { 0, 0 }
    local add = delay[1]
    delay[2] = delay[2] + add
    if delay[2] <= 0 then return send(mtable, dest, fname, args, callback) end
    SetTimeout(delay[2], function()
        delay[2] = delay[2] - add
        send(mtable, dest, fname, args, callback)
    end)
end

---@param itable table
---@param key string
local function resolve(itable, key)
    local mtable = getmetatable(itable)
    local fname, noWait = key, false
    if key:sub(1, 1) == '_' then
        fname, noWait = key:sub(2), true
    end
    if SERVER and mtable.name == 'vRP' and Tunnel.serverMembers[fname] then
        local fcall = routed(fname, noWait)
        rawset(itable, key, fcall)
        return fcall
    end
    local fcall = function(...)
        local dest, offset = nil, 1
        if SERVER then
            dest, offset = ..., 2
            dest = tonumber(dest) or -1
        end
        local n = select('#', ...) - offset + 1
        local first, second = select(offset, ...)
        -- 0.5 style: one args list, then an optional callback (a function never crosses the network in 1.0 / 2).
        if (n == 1 or n == 2) and Proxy.isArray(first) and (type(second) == 'function'
                or (second == nil and Proxy.style ~= '1.0')) then
            local cb = second
            local args = table.pack(table.unpack(first, 1, #first))
            delayed(mtable, dest, fname, args, cb and (not dest or dest >= 0) and function(rets)
                cb(unpackRets(rets))
            end or nil)
            return
        end
        local args = table.pack(select(offset, ...))
        if noWait or (dest and dest < 0) then
            delayed(mtable, dest, fname, args, nil)
            return
        end
        local p = promise.new()
        delayed(mtable, dest, fname, args, function(rets) p:resolve(rets) end)
        return unpackRets(Citizen.Await(p))
    end
    rawset(itable, key, fcall)
    return fcall
end

--- Answers requests to interface `name` from `interface`'s functions (on the server, global `source` is the player).
---@param name string
---@param interface table
function Tunnel.bindInterface(name, interface)
    RegisterLocalEvent(name .. ':tunnel_req')
    AddEventHandler(name .. ':tunnel_req', function(member, args, identifier, rid)
        local source = source
        if type(member) ~= 'string' or type(args) ~= 'table' or type(identifier) ~= 'string'
            or math.type(rid) ~= 'integer' then return end
        local answered = false
        local function reply(rets)
            if answered or rid < 0 then return end
            answered = true
            if SERVER then
                TriggerRemoteEvent(('%s:%s:tunnel_res'):format(name, identifier), source, rid, rets)
            else
                TriggerRemoteEvent(('%s:%s:tunnel_res'):format(name, identifier), rid, rets)
            end
        end
        local f = interface[member]
        local rets = table.pack()
        if type(f) == 'function' then
            local isDelayed = false
            -- vRP 0.5: a bound function may call TUNNEL_DELAYED() and answer later through the returned function.
            TUNNEL_DELAYED = function()
                isDelayed = true
                return function(later) reply(later or {}) end
            end
            local result = table.pack(xpcall(f, debug.traceback, table.unpack(args, 1, args.n or table.maxn(args))))
            TUNNEL_DELAYED = nil
            if not result[1] then
                print(('^1[vRP] tunnel %s.%s failed: %s^0'):format(name, member, result[2]))
            elseif isDelayed then
                return
            else
                rets = table.pack(table.unpack(result, 2, result.n))
            end
        end
        reply(rets)
    end)
end

--- The interface `name` on the other side: `iface.fn(...)` waits for the answer, `iface._fn(...)` does not.
---@param name string
---@param identifier? string unique per caller, default the resource name
---@return table
function Tunnel.getInterface(name, identifier)
    identifier = identifier or GetCurrentResourceName()
    local ids = Tools.newIDGenerator()
    local callbacks, dests = {}, {}
    local itable = setmetatable({}, {
        __index = resolve, name = name, ids = ids, callbacks = callbacks, dests = dests, identifier = identifier,
    })
    local function finish(rid, rets)
        local callback = callbacks[rid]
        if not callback then return end
        ids:free(rid)
        callbacks[rid] = nil
        dests[rid] = nil
        callback(type(rets) == 'table' and rets or {})
    end
    local event = ('%s:%s:tunnel_res'):format(name, identifier)
    RegisterLocalEvent(event)
    AddEventHandler(event, function(rid, rets)
        if SERVER and dests[rid] ~= tonumber(source) then return end
        finish(rid, rets)
    end)
    if SERVER then
        AddEventHandler('playerDropped', function()
            local dropped = tonumber(source)
            for rid, dest in pairs(dests) do
                if dest == dropped then finish(rid, {}) end
            end
            Tunnel.delays[dropped] = nil
        end)
    end
    return itable
end

return Tunnel
