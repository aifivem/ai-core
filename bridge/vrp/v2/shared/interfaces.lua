-- vRP 2 / 3 on ai-core, both sides: interfaces ("vRP.EXT.<name>" tunnels and proxies, and the ones scripts bind
-- themselves) are bound once per name with a table that looks the current owner's functions up at call time: a
-- script that restarts binds again without a second event handler, and a stopped script's functions stop answering.

local Proxy = module('vrp', 'lib/Proxy')
local Tunnel = module('vrp', 'lib/Tunnel')

local run = BridgeVRP2.run

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
