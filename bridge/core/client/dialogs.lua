-- ai-core's framework bridge, client UI: the framework menus and input dialogs on ai-lib's menu / input dialog. The
-- frameworks' menus stack (a sub menu over its parent) while ai-lib shows one dialog at a time: the bridge keeps the
-- stack and shows its top; a menu that stays open after a pick is shown again.

local RESOURCE = GetCurrentResourceName()
local ui = exports['ai-lib']

---@class BridgeDialog
---@field kind 'menu'|'input'
---@field owner string the resource that opened it (closed silently when that resource stops)
---@field build fun(): table the ai-lib `MenuRequest` / `InputRequest`, built when it is shown
---@field answer fun(value: any) the picked item id / the input values; nil when the player closed it

---@type BridgeDialog[]
local stack = {}
---@type { dialog: BridgeDialog, id: integer }|nil
local shown = nil
-- Request ids far above the ai-core resource's own lib menus (they answer on the same events with the same resource name).
local nextId = 0x40000000

local function render()
    local top = stack[#stack]
    if shown and shown.dialog == top then return end
    if not top then
        if shown then
            shown = nil
            ui:CloseDialog()
        end
        return
    end
    nextId = nextId + 1
    shown = { dialog = top, id = nextId }
    if top.kind == 'menu' then ui:OpenMenu(nextId, top.build()) else ui:OpenInput(nextId, top.build()) end
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
AddEventHandler('ai-lib:client:menuResult', onResult)
AddEventHandler('ai-lib:client:inputResult', onResult)

-- A stopped resource takes its dialogs with it, without calling back into it.
AddEventHandler('onClientResourceStop', function(resource)
    if resource == RESOURCE then return end
    for i = #stack, 1, -1 do
        if stack[i].owner == resource then table.remove(stack, i) end
    end
    if shown and shown.dialog.owner == resource then
        shown = nil
        ui:CloseDialog()
    end
    render()
end)
