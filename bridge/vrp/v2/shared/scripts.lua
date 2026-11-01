-- vRP 2 / 3 on ai-core, both sides: `loadScript`: an extension file of another resource runs inside ai-core's Lua
-- runtime in its own environment (globals stay its own), with every handler, thread, command, interface and
-- extension it creates owned by it.

local Proxy = module('vrp', 'lib/Proxy')
local Tunnel = module('vrp', 'lib/Tunnel')

local DEAD, onError, run, classOwner = BridgeVRP2.dead, BridgeVRP2.onError, BridgeVRP2.run, BridgeVRP2.classOwner
local vRP, removeExtension = BridgeVRP2.vRP, BridgeVRP2.removeExtension

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
