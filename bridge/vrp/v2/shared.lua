-- vRP 2 / 3 on ai-core, both sides: the `vRP` context object extensions see (`EXT`, `Extension`, `registerExtension`,
-- events), and `loadScript`: an extension file of another resource runs inside ai-core's Lua runtime, as in vRP, but in
-- its own environment (globals stay its own), with every handler, thread, command, interface and extension it creates
-- owned by it: they stop and go when that resource stops, and one failing extension never breaks ai-core.
-- vRP 2 (https://github.com/vRP-framework/vRP `vrp/vRPShared.lua`, `vrp/lib/utils.lua` module), vRP 3
-- (https://github.com/vRP-framework/vRP3-Dev, `unregisterExtension`, `extension-Unload`); MIT, Copyright (c) 2017
-- ImagicTheCat. Folder note: bridge/vrp/CLAUDE.md.

local Proxy = module('vrp', 'lib/Proxy')
local Tunnel = module('vrp', 'lib/Tunnel')

---@class VrpOwner one loaded script: what it registered goes when one of its resources stops
---@field key string `<resource>/<path>`
---@field resource string the script's resource
---@field resources table<string, true> the script's resource and the resource that loaded it
---@field dead boolean
---@field handlers table[] event handler handles
---@field cleanup fun()[] undo functions of everything else it registered
---@field exts table[] its registered extensions
---@field rets table|nil what the file returned

---@class BridgeVRP2Module
---@field vRP table the vRP context object (`vRP` inside loaded scripts)
---@field onExtension fun(ext: table, added: boolean)|nil side hook: an extension was registered or removed
BridgeVRP2 = {}

local DEAD = setmetatable({}, { __tostring = function() return 'vRP extension stopped' end })

--- xpcall handler: the stop sentinel passes through, any other error gets its traceback.
---@param err any
---@return any
local function onError(err)
    if err == DEAD then return DEAD end
    return debug.traceback(tostring(err), 2)
end

---@type table<thread, VrpOwner|false>
local threadOwner = setmetatable({}, { __mode = 'k' })
---@type table<table, VrpOwner>
local classOwner = setmetatable({}, { __mode = 'k' })
---@type table<table, VrpOwner>
local extOwner = setmetatable({}, { __mode = 'k' })

--- The loaded script the running code belongs to (nil = ai-core's own code).
---@return VrpOwner|nil
function BridgeVRP2.owner()
    return threadOwner[coroutine.running()] or nil
end

--- The loaded script that registered an extension (nil = ai-core's own).
---@param ext table
---@return VrpOwner|nil
function BridgeVRP2.ownerOf(ext)
    return extOwner[ext]
end

--- False once the owner's resource stopped (ai-core's own code is always alive).
---@param owner VrpOwner|nil
---@return boolean
function BridgeVRP2.alive(owner)
    return owner == nil or not owner.dead
end

--- Records how to undo something the running script registered (run when its resource stops).
---@param undo fun()
function BridgeVRP2.track(undo)
    local owner = BridgeVRP2.owner()
    if owner then owner.cleanup[#owner.cleanup + 1] = undo end
end

--- Runs `fn(...)` as code of `owner` (in the current thread), errors printed once and swallowed.
---@param owner VrpOwner|nil
---@param fn function
---@param ... any
---@return boolean ok
---@return any ...
function BridgeVRP2.run(owner, fn, ...)
    if owner and owner.dead then return false end
    local co = coroutine.running()
    local previous = threadOwner[co]
    threadOwner[co] = owner or false
    local rets = table.pack(xpcall(fn, onError, ...))
    threadOwner[co] = previous
    if not rets[1] and rets[2] ~= DEAD then
        print(('^1[vRP] %s: %s^0'):format(owner and owner.key or 'extension', tostring(rets[2])))
    end
    return table.unpack(rets, 1, rets.n)
end
local run = BridgeVRP2.run

-- Interfaces ("vRP.EXT.<name>" tunnels and proxies, and the ones scripts bind themselves) are bound once per name with
-- a table that looks the current owner's functions up at call time: a script that restarts binds again without a
-- second event handler, and a stopped script's functions stop answering.
---@type table<string, table<string, { owner: VrpOwner|nil, itable: table }>>
local dispatch = { proxy = {}, tunnel = {} }
---@type table<string, table<string, true>>
local bound = { proxy = {}, tunnel = {} }
---@type table<string, table>
local interfaces = {}

---@param kind 'proxy'|'tunnel'
---@param name string
---@param itable table
function BridgeVRP2.bind(kind, name, itable)
    local owner = BridgeVRP2.owner()
    local entry = { owner = owner, itable = itable }
    dispatch[kind][name] = entry
    BridgeVRP2.track(function()
        if dispatch[kind][name] == entry then dispatch[kind][name] = nil end
    end)
    if bound[kind][name] then return end
    bound[kind][name] = true
    local dispatcher = setmetatable({}, {
        __index = function(_, member)
            local current = dispatch[kind][name]
            if not current or not BridgeVRP2.alive(current.owner) then return nil end
            local f = current.itable[member]
            if type(f) ~= 'function' then return nil end
            return function(...)
                local rets = table.pack(run(current.owner, f, ...))
                if rets[1] then return table.unpack(rets, 2, rets.n) end
            end
        end,
    })
    if kind == 'proxy' then Proxy.addInterface(name, dispatcher) else Tunnel.bindInterface(name, dispatcher) end
end

--- `Proxy.getInterface` / `Tunnel.getInterface` made once per name (their answer handlers are never removed).
---@param kind 'proxy'|'tunnel'
---@param name string
---@param identifier? string
---@return table
function BridgeVRP2.interface(kind, name, identifier)
    local key = kind .. '\0' .. name .. '\0' .. (identifier or '')
    local itable = interfaces[key]
    if not itable then
        itable = kind == 'proxy' and Proxy.getInterface(name, identifier) or Tunnel.getInterface(name, identifier)
        interfaces[key] = itable
    end
    return itable
end

-- The vRP context (vRPShared). The server and client files add their fields.
local vRP = { EXT = {}, ext_listeners = {}, modules = module('vrp', 'cfg/modules'), log_level = 0 }
BridgeVRP2.vRP = vRP

--- vRP 2 Extension base class: `.tunnel` / `.proxy` become the interfaces "vRP.EXT.<name>", `.remote` the other side,
--- `.event` listeners, `.User` methods for every user.
vRP.Extension = class('vRP.Extension')

function vRP.Extension:__construct()
    local name = 'vRP.EXT.' .. class.name(self)
    if self.tunnel then
        self.tunnel_interface = {}
        for k, v in pairs(self.tunnel) do
            self.tunnel_interface[k] = function(...) return v(self, ...) end
        end
        BridgeVRP2.bind('tunnel', name, self.tunnel_interface)
    end
    if self.proxy then
        self.proxy_interface = {}
        for k, v in pairs(self.proxy) do
            self.proxy_interface[k] = function(...) return v(self, ...) end
        end
        BridgeVRP2.bind('proxy', name, self.proxy_interface)
    end
    self.remote = BridgeVRP2.interface('tunnel', name)
end

---@param msg string
---@param level? integer
function vRP.Extension:log(msg, level)
    vRP:log(msg, class.name(self), level)
end

---@param msg string
function vRP.Extension:error(msg)
    vRP:error(msg, class.name(self))
end

---@param msg any
---@param suffix? string
---@param level? integer
function vRP:log(msg, suffix, level)
    if (level or 0) > self.log_level then return end
    print(suffix and ('[vRP:%s] %s'):format(suffix, tostring(msg)) or ('[vRP] %s'):format(tostring(msg)))
end

---@param msg any
---@param suffix? string
function vRP:error(msg, suffix)
    error(suffix and ('[vRP:%s] %s'):format(suffix, tostring(msg)) or ('[vRP] %s'):format(tostring(msg)), 2)
end

--- Puts an extension object into `vRP.EXT` and its listeners in place (core extensions of ai-core use it directly).
---@param name string
---@param ext table
---@param events table|nil
---@param owner VrpOwner|nil
function BridgeVRP2.addExtension(name, ext, events, owner)
    vRP.EXT[name] = ext
    extOwner[ext] = owner
    for event, cb in pairs(events or {}) do
        local exts = vRP.ext_listeners[event]
        if not exts then
            exts = {}
            vRP.ext_listeners[event] = exts
        end
        exts[ext] = cb
    end
    if owner then owner.exts[#owner.exts + 1] = ext end
    if BridgeVRP2.onExtension then BridgeVRP2.onExtension(ext, true) end
end

---@param name string
---@param ext table
local function removeExtension(name, ext)
    if vRP.EXT[name] ~= ext then return end
    vRP.EXT[name] = nil
    for _, exts in pairs(vRP.ext_listeners) do exts[ext] = nil end
    if BridgeVRP2.onExtension then BridgeVRP2.onExtension(ext, false) end
    vRP:log(('Extension %s unloaded.'):format(name))
    vRP:triggerEvent('extension-Unload', ext)
end

--- Registers an Extension class: one instance in `vRP.EXT.<name>`, listeners bound, `extensionLoad` fired.
---@param extension table
function vRP:registerExtension(extension)
    if not class.is(extension, vRP.Extension) then return self:error('Not an Extension class.') end
    local name = class.name(extension)
    if self.EXT[name] then return self:error(('An extension named %s is already registered.'):format(name)) end
    local owner = classOwner[extension] or BridgeVRP2.owner()
    local rets = table.pack(run(owner, extension --[[@as function]]))
    if not rets[1] then return end
    local ext = rets[2]
    BridgeVRP2.addExtension(name, ext, extension.event, owner)
    self:log(('Extension %s loaded.'):format(name))
    self:triggerEvent('extensionLoad', ext)
end

--- vRP 3: removes a registered extension (its listeners and `vRP.EXT` entry) and fires `extension-Unload`.
---@param extension table
function vRP:unregisterExtension(extension)
    local name = class.name(extension)
    local ext = name and self.EXT[name]
    if not ext then return self:error(('An extension named %s is not registered.'):format(tostring(name))) end
    removeExtension(name, ext)
end

--- Runs every listener of `name` in its own thread (as vRP), each as code of its extension's script.
---@param name string
---@param ... any
function vRP:triggerEvent(name, ...)
    local exts = self.ext_listeners[name]
    if not exts then return end
    local params = table.pack(...)
    for ext, fn in pairs(exts) do
        local owner = extOwner[ext]
        if BridgeVRP2.alive(owner) then
            Citizen.CreateThreadNow(function() run(owner, fn, ext, table.unpack(params, 1, params.n)) end)
        end
    end
end

--- Like `triggerEvent`, then waits until every listener finished (when the caller can wait).
---@param name string
---@param ... any
function vRP:triggerEventSync(name, ...)
    local exts = self.ext_listeners[name]
    if not exts then return end
    local params = table.pack(...)
    local pending, p = 0, promise.new()
    for ext, fn in pairs(exts) do
        local owner = extOwner[ext]
        if BridgeVRP2.alive(owner) then
            pending = pending + 1
            Citizen.CreateThreadNow(function()
                run(owner, fn, ext, table.unpack(params, 1, params.n))
                pending = pending - 1
                if pending == 0 then p:resolve(true) end
            end)
        end
    end
    if pending > 0 and coroutine.isyieldable() then Citizen.Await(p) end
end

-- loadScript ------------------------------------------------------------------------------------------------------

---@type table<string, VrpOwner>
local loaded = {}

--- Stops a loaded script: handlers removed, threads end at their next wait, extensions and everything it registered
--- removed, the file loads again on the next `loadScript`.
---@param owner VrpOwner
local function unload(owner)
    if owner.dead then return end
    owner.dead = true
    if loaded[owner.key] == owner then loaded[owner.key] = nil end
    for i = 1, #owner.handlers do RemoveEventHandler(owner.handlers[i]) end
    for i = #owner.exts, 1, -1 do
        local ext = owner.exts[i]
        local name = class.name(ext)
        if name then removeExtension(name, ext) end
    end
    for i = #owner.cleanup, 1, -1 do
        local ok, err = pcall(owner.cleanup[i])
        if not ok then print(('^1[vRP] unloading %s: %s^0'):format(owner.key, err)) end
    end
    owner.handlers, owner.cleanup, owner.exts = {}, {}, {}
end

AddEventHandler('onResourceStop', function(resource)
    for _, owner in pairs(loaded) do
        if owner.resources[resource] then unload(owner) end
    end
end)

--- The globals of one loaded script: its own table over ai-core's globals, with the functions that register
--- something replaced by owned versions.
---@param owner VrpOwner
---@return table
local function makeEnv(owner)
    local env = {}
    local function wait(ms)
        Wait(ms)
        if owner.dead then error(DEAD, 0) end
    end
    local function thread(fn, now)
        local start = now and Citizen.CreateThreadNow or CreateThread
        start(function() run(owner, fn) end)
    end
    local function timeout(ms, fn)
        SetTimeout(ms, function() run(owner, fn) end)
    end
    local function addHandler(name, fn)
        local handle = AddEventHandler(name, function(...) run(owner, fn, ...) end)
        owner.handlers[#owner.handlers + 1] = handle
        return handle
    end
    local function registerNet(name, fn)
        RegisterNetEvent(name)
        if fn then return addHandler(name, fn) end
    end

    ---@type table<string, table>
    local modules = {}
    env.module = function(rsc, path)
        if path == nil then rsc, path = 'vrp', rsc end
        if rsc == 'vrp' then return module(rsc, path) end
        local key = rsc .. '/' .. path
        local cached = modules[key]
        if cached then return table.unpack(cached, 1, cached.n) end
        local code = LoadResourceFile(rsc, path .. '.lua')
        if not code then error(('resource file %s/%s.lua not found'):format(rsc, path), 2) end
        local chunk, err = load(code, ('@%s/%s.lua'):format(rsc, path), 't', env)
        if not chunk then error(('error parsing module %s/%s: %s'):format(rsc, path, err), 2) end
        local rets = table.pack(xpcall(chunk, onError))
        if not rets[1] then error(('error loading module %s/%s: %s'):format(rsc, path, tostring(rets[2])), 2) end
        cached = table.pack(table.unpack(rets, 2, rets.n))
        modules[key] = cached
        return table.unpack(cached, 1, cached.n)
    end
    env.class = setmetatable({}, {
        __index = class,
        __call = function(_, name, ...)
            local c = class(name, ...)
            classOwner[c] = owner
            return c
        end,
    })
    env.async = function(fn)
        if fn then return thread(fn, true) end
        return async()
    end
    env.Citizen = setmetatable({
        CreateThread = thread,
        CreateThreadNow = function(fn) thread(fn, true) end,
        SetTimeout = timeout,
        Wait = wait,
    }, { __index = Citizen })
    env.CreateThread = thread
    env.SetTimeout = timeout
    env.Wait = wait
    env.AddEventHandler = addHandler
    env.RegisterNetEvent = registerNet
    env.RegisterServerEvent = registerNet
    env.RegisterCommand = function(name, fn, restricted)
        RegisterCommand(name, function(...) run(owner, fn, ...) end, restricted)
    end
    if CLIENT then
        env.RegisterNUICallback = function(name, fn)
            RegisterNUICallback(name, function(...) run(owner, fn, ...) end)
        end
    end
    env.Proxy = setmetatable({
        addInterface = function(name, itable) BridgeVRP2.bind('proxy', name, itable) end,
        getInterface = function(name, identifier) return BridgeVRP2.interface('proxy', name, identifier) end,
    }, { __index = Proxy })
    env.Tunnel = setmetatable({
        bindInterface = function(name, itable) BridgeVRP2.bind('tunnel', name, itable) end,
        getInterface = function(name, identifier) return BridgeVRP2.interface('tunnel', name, identifier) end,
    }, { __index = Tunnel })
    env.vRP = vRP
    env._G = env
    return setmetatable(env, { __index = _G })
end

--- vRP 2's `loadScript(resource, path)`: runs `<resource>/<path>.lua` once in the vRP context (cached per file until
--- one of its resources stops). `invoker` (the resource that asked) owns it too.
---@param resource any
---@param path any
---@param invoker? string
---@return any ... what the file returned
function BridgeVRP2.loadScript(resource, path, invoker)
    if type(resource) ~= 'string' or type(path) ~= 'string' then return end
    local key = resource .. '/' .. path
    local owner = loaded[key]
    if owner then
        if owner.rets then return table.unpack(owner.rets, 1, owner.rets.n) end
        return
    end
    local code = LoadResourceFile(resource, path .. '.lua')
    if not code then
        print(('^1[vRP] loadScript: %s.lua not found^0'):format(key))
        return
    end
    owner = {
        key = key, resource = resource, resources = { [resource] = true }, dead = false, handlers = {}, cleanup = {},
        exts = {},
    }
    if invoker then owner.resources[invoker] = true end
    local chunk, err = load(code, ('@%s/%s.lua'):format(resource, path), 't', makeEnv(owner))
    if not chunk then
        print(('^1[vRP] loadScript %s: %s^0'):format(key, err))
        return
    end
    loaded[key] = owner
    local rets = table.pack(run(owner, chunk))
    if not rets[1] then
        unload(owner)
        return
    end
    owner.rets = table.pack(table.unpack(rets, 2, rets.n))
    return table.unpack(owner.rets, 1, owner.rets.n)
end
