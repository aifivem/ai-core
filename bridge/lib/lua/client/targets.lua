-- The target scripts `Points` put their options on (used through `Points` and `ModelPoints`), like the TypeScript
-- lib's `targets.ts`: one adapter each, in the order they win when several run (`docs/compat/target.md`). The calls
-- run in the resource that owns the points, since every target drops a stopped resource's options by that name.

local resource = GetCurrentResourceName()

-- The adapters, in win order: lua/client/targets/adapters.lua.
local LIST = aiLib.loadPart('targets/adapters')
local names = {}
for _, target in ipairs(LIST) do names[target.resource] = true end

-- Targets that read started but had no exports yet (client loading): skipped until a target starts.
local notReady = {}
local listeners = {}
local queued = false
local function changed()
    if queued then return end
    queued = true
    SetTimeout(0, function()
        queued = false
        for _, fn in ipairs(listeners) do fn() end
    end)
end
AddEventHandler('onClientResourceStart', function(name)
    if not names[name] then return end
    notReady = {}
    changed()
end)
AddEventHandler('onClientResourceStop', function(name)
    if names[name] then changed() end
end)

local targets = {}

---The target options go on: the first running, ready one in win order, or nil.
---@return { resource: string, adapter: table }?
function targets.active()
    for _, target in ipairs(LIST) do
        if not notReady[target.resource] and GetResourceState(target.resource) == 'started' then return target end
    end
end

---Runs `fn` when the target in use may have changed (one started, stopped or turned out not ready).
---@param fn fun()
function targets.onChange(fn) listeners[#listeners + 1] = fn end

---@return boolean ok, any result
local function use(target, fn)
    local ok, result = pcall(fn, target.adapter)
    if ok then return true, result end
    if tostring(result):find('No such export', 1, true) then
        notReady[target.resource] = true
        changed()
    else
        print(('^1[%s] %s target call failed: %s^0'):format(resource, target.resource, result))
    end
    return false
end

---Puts an option on a target; nil when it could not take it (the point stays a prompt meanwhile).
---@param add fun(adapter: table): any
---@param remove fun(adapter: table, value: any)
---@return { target: table, remove: fun(adapter: table) }?
function targets.register(target, add, remove)
    local ok, value = use(target, add)
    if not ok then return nil end
    return { target = target, remove = function(adapter) remove(adapter, value) end }
end

---Takes an option off its target again (nothing to do when that target stopped).
---@param registration { target: table, remove: fun(adapter: table) }?
function targets.unregister(registration)
    if registration and GetResourceState(registration.target.resource) == 'started' then
        use(registration.target, registration.remove)
    end
end

return targets
