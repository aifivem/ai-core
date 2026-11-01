-- vRP on ai-core, client side: vRP 1 binds one table (`tvRP`) as the client "vRP" tunnel (the server calls
-- `vRPclient.fn(source, ...)`) and as the client "vRP" proxy (client scripts call `vRP.fn(...)`); ai-core does the
-- same with `BridgeVRPClient.tvRP`. Layout and how to add a function: bridge/vrp/CLAUDE.md.

local Proxy = module('vrp', 'lib/Proxy')
local Tunnel = module('vrp', 'lib/Tunnel')

---@class BridgeVRPClientModule
---@field tvRP table<string, function> client functions of vRP 1 (`tvRP.*`): every work package adds its functions here
---@field server table the server "vRP" tunnel (`BridgeVRPClient.server.fn(...)`, only `BridgeVRP.tunnel` functions answer)
BridgeVRPClient = {
    tvRP = {},
    server = Tunnel.getInterface('vRP', 'ai-core'),
}

local tvRP = BridgeVRPClient.tvRP

--- The local ped's position.
---@return number x
---@return number y
---@return number z
function tvRP.getPosition()
    local coords = GetEntityCoords(aiLib.cache.ped)
    return coords.x, coords.y, coords.z
end

Tunnel.bindInterface('vRP', tvRP)
Proxy.addInterface('vRP', tvRP)
