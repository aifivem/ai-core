-- vRP 1 server API on ai-core, base: the panel's vRP mapping, user helpers, user / tmp data tables, UData / SData and
-- vRP's DB API (`prepare` / `query` / `execute` / `scalar`). Signatures: vRP 1.0 `vrp/base.lua`, vRPex / Zirix
-- `vrp/base.lua`, vRP 0.5 / Dunko `vrp/base.lua` (`isConnected`, `isFirstSpawn`, `getPlayerName`).
-- v1 `user_id` = ai-core character id; data of a character that is not loaded answers like vRP's (nil / 0 / false).

local core = Bridge.core

---@class VrpPermissionRule
---@field permission string exact, or a prefix when it ends with `*`
---@field job string
---@field gang string
---@field group string an extra vRP group
---@field grade integer minimum job / gang grade
---@field onDuty boolean
---@field admin boolean
---@field everyone boolean

---@class VrpGroupAlias
---@field job string
---@field gang string
---@field grade integer
---@field admin boolean

---@class VrpConfig the panel's vRP mapping (`VrpConfig` in @aicore-fivem/shared vrp.ts)
---@field defaults { jobPrefix: boolean, jobOnDuty: boolean, adminPrefix: boolean, playerPrefix: boolean }
---@field permissions VrpPermissionRule[]
---@field groups table<string, VrpGroupAlias>
---@field items table<string, string>

---@type VrpConfig
local config = core:GetVrpConfig() or { defaults = {}, permissions = {}, groups = {}, items = {} }
---@type fun(config: VrpConfig)[]
local configListeners = {}

--- The panel's vRP mapping (`data/vrp.json`: permissions, group and item aliases), kept current.
---@return VrpConfig
function BridgeVRP.config()
    return config
end

--- Runs `fn(config)` after each panel change of the vRP mapping.
---@param fn fun(config: VrpConfig)
function BridgeVRP.onConfig(fn)
    configListeners[#configListeners + 1] = fn
end

AddEventHandler('ai-core:vrp:config', function(next)
    if GetInvokingResource() and GetInvokingResource() ~= 'ai-core' then return end
    if type(next) ~= 'table' then return end
    config = next
    for i = 1, #configListeners do
        local ok, err = pcall(configListeners[i], next)
        if not ok then print(('^1[vRP] config listener failed: %s^0'):format(err)) end
    end
end)

--- The mirror and source of a loaded character (v1 user_id); nil when it is not loaded.
---@param userId any
---@return BridgeMirror|nil mirror
---@return integer|nil source
function BridgeVRP.mirror(userId)
    local source = BridgeVRP.sourceOf(userId)
    local mirror = source and Bridge.players[source]
    if not mirror then return nil, nil end
    return mirror, source
end

--- A Lua function or a function reference from another resource (msgpack turns those into callable tables).
---@param value any
---@return boolean
function BridgeVRP.isCallable(value)
    if type(value) == 'function' then return true end
    local meta = type(value) == 'table' and getmetatable(value)
    return meta and type(meta.__call) == 'function' or false
end

--- Calls a script's callback; an error in it is printed and answers nil.
---@param fn any
---@return any ...
function BridgeVRP.call(fn, ...)
    if not BridgeVRP.isCallable(fn) then return nil end
    local result = table.pack(pcall(fn, ...))
    if not result[1] then
        print(('^1[vRP] callback failed: %s^0'):format(result[2]))
        return nil
    end
    return table.unpack(result, 2, result.n)
end

--- The resource calling a proxy function (`ai-core` for the bridge's own calls).
---@return string
function BridgeVRP.caller()
    return GetInvokingResource() or 'ai-core'
end

---@type table<string, true>
local warned = {}

--- Prints a warning once per key.
---@param key string
---@param text string
function BridgeVRP.warnOnce(key, text)
    if warned[key] then return end
    warned[key] = true
    print(('^3[vRP] %s^0'):format(text))
end
