-- vRP 2 / 3 on ai-core, both sides: the `vRP` context object extensions see (`EXT`, `Extension`, `registerExtension`,
-- events), and `loadScript`: an extension file of another resource runs inside ai-core's Lua runtime, as in vRP, but in
-- its own environment (globals stay its own), with every handler, thread, command, interface and extension it creates
-- owned by it: they stop and go when that resource stops, and one failing extension never breaks ai-core.
-- vRP 2 (https://github.com/vRP-framework/vRP `vrp/vRPShared.lua`, `vrp/lib/utils.lua` module), vRP 3
-- (https://github.com/vRP-framework/vRP3-Dev, `unregisterExtension`, `extension-Unload`); MIT, Copyright (c) 2017
-- ImagicTheCat. Folder note: bridge/vrp/CLAUDE.md.
-- This file: the `BridgeVRP2` namespace and which loaded script owns the running code.

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
---@field dead table the stop sentinel a stopped script's `Wait` raises
---@field onError fun(err: any): any xpcall handler (the stop sentinel passes through)
---@field classOwner table<table, VrpOwner> class -> the script that made it
---@field extOwner table<table, VrpOwner> extension -> the script that registered it
---@field removeExtension fun(name: string, ext: table)
---@field v1 fun(name: string, default: any, ...: any): any server: a vRP 1 function of the bridge, looked up at call time
---@field gui fun(): BridgeVRPUi|nil server: `BridgeVRP.ui`
---@field amountOf fun(value: any): integer|nil server
---@field ownerResource fun(): string server
---@field datatable string server: the `vRP:datatable` key
---@field stored table<table, { u: string|nil, c: string|nil }> server: user -> last stored msgpack of data / cdata
---@field saveUser fun(user: table) server
---@field loadTable fun(kind: string, owner: any): table server
---@field cdataView fun(user: table, raw: table): table server
---@field coreMixins { methods: table, construct: fun(user: table)|nil }[] server: User methods of the core extensions
---@field scriptUserExts table[] server: script extensions with User methods
---@field userMeta table server: the users' metatable
---@field rebuildUser fun() server
---@field constructFor fun(ext: table, user: table) server
---@field userExtension fun(ext: table, added: boolean) server: what `onExtension` is set to
---@field coreExtension fun(name: string, ext: table, events: table|nil, user: table|nil): table server
---@field items table<string, table> server: items vRP 2 extensions define
---@field itemMenu string server: the item menu name
---@field inventory table server: `vRP.EXT.Inventory`
---@field identityOf fun(cid: integer, identity: any): table|nil server
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

BridgeVRP2.dead = DEAD
BridgeVRP2.onError = onError
BridgeVRP2.classOwner = classOwner
BridgeVRP2.extOwner = extOwner
