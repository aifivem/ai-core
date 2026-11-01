-- vRP 2 / 3 on ai-core, both sides: the vRP context (vRPShared) extensions see: `EXT`, `Extension`,
-- `registerExtension`, events. The server and client files add their fields.

local run, classOwner, extOwner = BridgeVRP2.run, BridgeVRP2.classOwner, BridgeVRP2.extOwner

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

BridgeVRP2.removeExtension = removeExtension
