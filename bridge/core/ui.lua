-- ai-core's framework bridge, client UI: the framework menus, text prompts and progress bars of ESX and QB drawn by
-- ai-core's own menu / input dialog, prompts and progress bar (no NUI of the bridge's own). The frameworks' menus
-- stack (a sub menu over its parent) while ai-core shows one dialog at a time: the bridge keeps the stack and shows
-- its top; a menu that stays open after a pick is shown again.

local RESOURCE = GetCurrentResourceName()
local core = exports['ai-core']

---@class BridgeDialog
---@field kind 'menu'|'input'
---@field owner string the resource that opened it (closed silently when that resource stops)
---@field build fun(): table the ai-core `MenuRequest` / `InputRequest`, built when it is shown
---@field answer fun(value: any) the picked item id / the input values; nil when the player closed it

---@class BridgeUI
BridgeUI = {}

--- A Lua function or a function reference from another resource (msgpack turns those into callable tables).
---@param value any
---@return boolean
function BridgeUI.isCallable(value)
    if type(value) == 'function' then return true end
    local meta = type(value) == 'table' and getmetatable(value)
    return meta and type(meta.__call) == 'function' or false
end

--- Calls a script's callback; an error in it is printed and does not break the bridge's menu state.
---@param fn any
---@return any
function BridgeUI.call(fn, ...)
    if not BridgeUI.isCallable(fn) then return end
    local ok, result = pcall(fn, ...)
    if not ok then print(('^1[ai-core bridge] callback failed: %s^0'):format(result)) end
    return ok and result or nil
end

--- Framework text made plain for ai-core's UI: HTML tags and GTA colour codes (`~r~`) removed.
---@param text any
---@return string
function BridgeUI.clean(text)
    return aiLib.stripGameText(text)
end

--- A Font Awesome class list (`fas fa-scroll`) as ai-core's icon name (`scroll`); nil without one.
---@param icon any
---@return string|nil
function BridgeUI.icon(icon)
    if type(icon) ~= 'string' then return nil end
    local name = icon:match('fa%-([%w%-]+)%s*$') or icon:match('^([%w%-]+)$')
    return name ~= '' and name or nil
end

---@type (fun(key: string, ...: string|number): string)|nil
local translate

--- One of ai-core's lang texts (ai-lib's locale: `locales/en.json` overlaid with the `ai:locale` language).
---@param key string
---@return string
function BridgeUI.text(key)
    translate = translate or aiLib.locale(RESOURCE)
    return translate(key)
end

-- Dialogs ------------------------------------------------------------------------------------------------------------

---@type BridgeDialog[]
local stack = {}
---@type { dialog: BridgeDialog, id: integer }|nil
local shown = nil
-- Request ids far above ai-core's own lib menus (they answer on the same events with the same resource name).
local nextId = 0x40000000

local function render()
    local top = stack[#stack]
    if shown and shown.dialog == top then return end
    if not top then
        if shown then
            shown = nil
            core:CloseDialog()
        end
        return
    end
    nextId = nextId + 1
    shown = { dialog = top, id = nextId }
    if top.kind == 'menu' then core:OpenMenu(nextId, top.build()) else core:OpenInput(nextId, top.build()) end
end

---@param dialog BridgeDialog
local function remove(dialog)
    for i = #stack, 1, -1 do
        if stack[i] == dialog then table.remove(stack, i) end
    end
end

--- Shows `dialog` on top; `replaces` leaves the stack in the same step (no close and reopen in between).
---@param dialog BridgeDialog
---@param replaces? BridgeDialog
function BridgeUI.open(dialog, replaces)
    if replaces then remove(replaces) end
    stack[#stack + 1] = dialog
    render()
end

---@param dialog BridgeDialog
function BridgeUI.close(dialog)
    remove(dialog)
    render()
end

--- Shows an open dialog again with what its `build` returns now.
---@param dialog BridgeDialog
function BridgeUI.refresh(dialog)
    if shown and shown.dialog == dialog then shown = nil end
    render()
end

---@param dialog BridgeDialog
---@return boolean
function BridgeUI.isOpen(dialog)
    for i = 1, #stack do
        if stack[i] == dialog then return true end
    end
    return false
end

---@param owner string
---@param id integer
---@param value any
local function onResult(owner, id, value)
    if owner ~= RESOURCE or not shown or shown.id ~= id then return end
    local dialog = shown.dialog
    shown = nil
    dialog.answer(value)
    if value ~= nil then return render() end
    -- A close may come from another dialog taking the screen: show the bridge's top again only when nothing else did.
    SetTimeout(0, function()
        if not shown and not IsNuiFocused() then render() end
    end)
end
AddEventHandler('ai-core:client:menuResult', onResult)
AddEventHandler('ai-core:client:inputResult', onResult)

-- Text prompts -------------------------------------------------------------------------------------------------------

---@type table<string, string>
local promptOwners = {}
---@type table<string, fun()>
local promptHandlers = {}

--- Shows (or changes) the bridge's prompt `id` on the right of the screen for `owner`.
---@param id string
---@param text any
---@param owner string
function BridgeUI.showText(id, text, owner)
    promptOwners[id] = owner
    core:ShowPrompt('bridge:' .. id, BridgeUI.clean(text))
end

---@param id string
function BridgeUI.hideText(id)
    if not promptOwners[id] then return end
    promptOwners[id] = nil
    core:HidePrompt('bridge:' .. id)
end

--- Runs `fn` when the player presses ai-core's interaction key while the bridge's prompt `id` is on top.
---@param id string
---@param fn fun()
function BridgeUI.onPrompt(id, fn)
    promptHandlers[id] = fn
end

AddEventHandler('ai-core:client:promptPressed', function(owner, id)
    if owner ~= RESOURCE or type(id) ~= 'string' then return end
    local handler = promptHandlers[id:match('^bridge:(.+)$') or '']
    if handler then handler() end
end)

-- Progress -----------------------------------------------------------------------------------------------------------

---@class BridgeProgressOptions
---@field label string
---@field duration integer ms
---@field owner string
---@field canCancel? boolean
---@field whileDead? boolean
---@field freeze? boolean
---@field disable? { disableMovement?: boolean, disableCarMovement?: boolean, disableMouse?: boolean, disableCombat?: boolean }
---@field anim? { dict: string, clip: string, flag?: integer }
---@field scenario? string
---@field onDone fun(cancelled: boolean)

---@type { options: BridgeProgressOptions, silent: boolean }|nil
local running = nil

--- Runs a timed action with ai-lib's progress (ai-core's bar; the frameworks' progress bars); false while one runs.
--- The cancel key is ai-core's (`aicore_cancel_progress`), the same one every resource's progress uses.
---@param options BridgeProgressOptions
---@return boolean
function BridgeUI.progress(options)
    if running then return false end
    local own = { options = options, silent = false }
    running = own
    CreateThread(function()
        local d = options.disable or {}
        local done = aiLib.progress({
            label = BridgeUI.clean(options.label),
            duration = options.duration,
            anim = options.anim,
            scenario = options.scenario,
            allowVehicle = true,
            canCancel = options.canCancel ~= false,
            whileDead = options.whileDead,
            freeze = options.freeze,
            disable = { move = d.disableMovement, car = d.disableCarMovement, mouse = d.disableMouse, combat = d.disableCombat },
        })
        running = nil
        if not own.silent then BridgeUI.call(options.onDone, not done) end
    end)
    return true
end

--- Cancels the running progress (the frameworks' cancel functions); `force` cancels one that cannot be.
---@param force? boolean
function BridgeUI.cancelProgress(force)
    if running and (force or running.options.canCancel ~= false) then aiLib.progress.cancel() end
end

---@return boolean
function BridgeUI.isProgressRunning() return running ~= nil end

-- Scripts that run QB's `cancelprog` command themselves.
RegisterCommand('cancelprog', function() BridgeUI.cancelProgress() end, false)

-- A stopped resource takes its dialogs, prompts and progress with it, without calling back into it.
AddEventHandler('onClientResourceStop', function(resource)
    if resource == RESOURCE then return end
    for i = #stack, 1, -1 do
        if stack[i].owner == resource then table.remove(stack, i) end
    end
    if shown and shown.dialog.owner == resource then
        shown = nil
        core:CloseDialog()
    end
    render()
    for id, owner in pairs(promptOwners) do
        if owner == resource then BridgeUI.hideText(id) end
    end
    if running and running.options.owner == resource then
        running.silent = true
        aiLib.progress.cancel()
    end
end)
