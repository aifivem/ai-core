-- Event hooks (qbx_core's modules/hooks.lua): `registerHook(event, cb)`, a callback returning false cancels. ai-core
-- runs the hook points qbx_core has: `addMoney`, `removeMoney`, `setMoney`.

local provide = BridgeQbox.provide

---@class QboxHook
---@field fn function
---@field resource string
---@field id integer

---@type table<string, QboxHook[]>
local hooks = {}
local hookId = 0

provide('registerHook', function(event, cb)
    if type(event) ~= 'string' or cb == nil then return 0 end
    hookId = hookId + 1
    local list = hooks[event]
    if not list then list = {} hooks[event] = list end
    list[#list + 1] = { fn = cb, resource = GetInvokingResource() or 'ai-core', id = hookId }
    return hookId
end)

---@param resource string
---@param id? integer
local function removeHooks(resource, id)
    for _, list in pairs(hooks) do
        for i = #list, 1, -1 do
            if list[i].resource == resource and (not id or list[i].id == id) then table.remove(list, i) end
        end
    end
end

provide('removeHooks', function(id) removeHooks(GetInvokingResource() or 'ai-core', tonumber(id)) end)
AddEventHandler('onResourceStop', function(resource) removeHooks(resource) end)

--- Runs the hooks of an event; false when one cancels it.
---@param event string
---@param payload table
---@return boolean
local function runHooks(event, payload)
    local list = hooks[event]
    if not list then return true end
    for i = 1, #list do
        local ok, answer = pcall(list[i].fn, payload)
        if not ok then print(('^1[ai-core bridge] qbx_core hook %s of %s failed: %s^0'):format(event, list[i].resource, answer)) end
        if answer == false then return false end
    end
    return true
end

BridgeQbox.runHooks = runHooks
