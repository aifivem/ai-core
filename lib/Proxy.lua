-- vRP's Proxy on ai-core: calls between resources over local events, vRP's own wire format, so scripts that ship
-- their own copy of Proxy talk to this one:
--   call   TriggerEvent('<iface>:proxy', member, args, identifier, rid)        (rid -1 = no answer wanted)
--   answer TriggerEvent('<iface>:<identifier>:proxy_res', rid, rets)
-- `args` / `rets` are packed lists (`n` = count, vRP 2/3) or plain lists (vRP 1.0): both are read.
-- A local TriggerEvent runs the handlers at once, so an answer that does not wait is there when TriggerEvent
-- returns: the call returns it without a thread (vRP 0.5 scripts call synchronously). A waiting answer needs a
-- thread, as in vRP 1.0 / 2.
-- vRP 0.5 style `iface.member({ args... })` is detected here (lib/Tunnel.lua shares the style).
-- Based on vRP 1.0 / 2 lib/Proxy.lua (https://github.com/vRP-framework/vRP, MIT, Copyright (c) 2017 ImagicTheCat).

local Tools = module('vrp', 'lib/Tools')

---@class VrpProxyModule
---@field style '0.5'|'1.0'|nil this resource's call style once known (its first `getUserId` call shows it)
local Proxy = {}

-- ai-core's own code (bridge, vRP 2 extensions) always calls in the 1.0 / 2 style.
Proxy.style = GetCurrentResourceName() == 'ai-core' and '1.0' or nil

--- vRP 0.5 functions that answer through a function as the last element of their args table (`cbr`).
---@type table<string, true>
Proxy.callbackMembers = {
    accessHome = true, buildMenu = true, findFreeNumber = true, generatePhoneNumber = true,
    generateRegistrationNumber = true, getLastLogin = true, getSData = true, getUData = true, getUserAddress = true,
    getUserBusiness = true, getUserByAddress = true, getUserByPhone = true, getUserByRegistration = true,
    getUserIdByIdentifiers = true, getUserIdentity = true, isBanned = true, isWhitelisted = true, sendSMS = true,
    sendSMSPos = true, prompt = true, request = true,
}
--- 0.5 `prompt` / `request` callbacks get the player first: `function(player, result)`.
local callbackWithSource = { prompt = true, request = true }

---@param t any
---@return boolean
function Proxy.isArray(t)
    if type(t) ~= 'table' then return false end
    local count = 0
    for k in pairs(t) do
        if math.type(k) ~= 'integer' or k < 1 then return false end
        count = count + 1
    end
    return count == #t
end

---@param rets table
local function unpackRets(rets)
    return table.unpack(rets, 1, rets.n or table.maxn(rets))
end
Proxy.unpack = unpackRets

---@type table<string, true>
local warned = {}
local function warnOnce(key, text)
    if warned[key] then return end
    warned[key] = true
    print(('^3[vRP] %s^0'):format(text))
end

--- One request: the answer comes back through `callbacks[rid]`, synchronously when the handler did not wait.
---@param mtable table
---@param fname string
---@param args table packed
---@param noWait boolean
local function request(mtable, fname, args, noWait)
    if noWait then
        TriggerEvent(mtable.name .. ':proxy', fname, args, mtable.identifier, -1)
        return
    end
    local rid = mtable.ids:gen()
    local slot = {}
    mtable.callbacks[rid] = function(rets)
        slot.rets = rets
        if slot.p then slot.p:resolve(rets) end
    end
    TriggerEvent(mtable.name .. ':proxy', fname, args, mtable.identifier, rid)
    if slot.rets then return unpackRets(slot.rets) end
    if not coroutine.isyieldable() then
        warnOnce(fname, ('proxy call %s.%s waits for its answer: call it inside a thread (CreateThread)'):format(mtable.name, fname))
        return
    end
    slot.p = promise.new()
    return unpackRets(Citizen.Await(slot.p))
end

--- A 0.5 call `member({ a, b[, cb] }[, cb])`: unpacked, the callback (if any) gets the answer in a thread.
---@param mtable table
---@param fname string
---@param list table
---@param cb function|nil
---@param noWait boolean
local function call05(mtable, fname, list, cb, noWait)
    local args = table.pack(table.unpack(list, 1, #list))
    if not cb and Proxy.callbackMembers[fname] and type(args[args.n]) == 'function' then
        cb = args[args.n]
        args[args.n] = nil
        args.n = args.n - 1
    end
    if not cb then return request(mtable, fname, args, noWait) end
    Citizen.CreateThreadNow(function()
        local rets = table.pack(request(mtable, fname, args, false))
        if callbackWithSource[fname] then
            cb(args[1], unpackRets(rets))
        else
            cb(unpackRets(rets))
        end
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
    local fcall = function(...)
        local n = select('#', ...)
        local first, second = ...
        if fname == 'getUserId' and Proxy.style == nil then
            Proxy.style = type(first) == 'table' and '0.5' or '1.0'
        end
        if Proxy.style ~= '1.0' and (n == 1 or n == 2) and Proxy.isArray(first)
            and (second == nil or type(second) == 'function') then
            return call05(mtable, fname, first, second, noWait)
        end
        return request(mtable, fname, table.pack(...), noWait)
    end
    rawset(itable, key, fcall)
    return fcall
end

--- Answers calls to interface `name` from `itable`'s functions (may be called again with another table).
---@param name string
---@param itable table
function Proxy.addInterface(name, itable)
    AddEventHandler(name .. ':proxy', function(member, args, identifier, rid)
        if type(member) ~= 'string' or type(args) ~= 'table' then return end
        local f = itable[member]
        local rets
        if type(f) == 'function' then
            local result = table.pack(xpcall(f, debug.traceback, table.unpack(args, 1, args.n or table.maxn(args))))
            if result[1] then
                rets = table.pack(table.unpack(result, 2, result.n))
            else
                print(('^1[vRP] proxy %s.%s failed: %s^0'):format(name, member, result[2]))
            end
        else
            warnOnce(name .. '.' .. member, ('proxy call %s.%s not found'):format(name, member))
        end
        if type(rid) == 'number' and rid >= 0 then
            TriggerEvent(('%s:%s:proxy_res'):format(name, identifier), rid, rets or table.pack())
        end
    end)
end

--- The interface `name`: `iface.fn(...)` waits for the answer, `iface._fn(...)` does not.
---@param name string
---@param identifier? string unique per caller, default the resource name
---@return table
function Proxy.getInterface(name, identifier)
    identifier = identifier or GetCurrentResourceName()
    local ids = Tools.newIDGenerator()
    local callbacks = {}
    local itable = setmetatable({}, {
        __index = resolve, name = name, ids = ids, callbacks = callbacks, identifier = identifier,
    })
    AddEventHandler(('%s:%s:proxy_res'):format(name, identifier), function(rid, rets)
        local callback = callbacks[rid]
        if not callback then return end
        ids:free(rid)
        callbacks[rid] = nil
        callback(type(rets) == 'table' and rets or {})
    end)
    return itable
end

return Proxy
