-- A key the player can rebind in GTA's settings, with the default key from ai-core's admin panel (Keybinds tab),
-- the same protocol as the TypeScript lib's `Keybind`: announce `ai-core:client:keybind`, ai-core answers
-- `ai-core:client:keybindKey (resource, name, key)` at start and again when the panel changes the key.

local resource = GetCurrentResourceName()
---@type table<string, fun(key: string)>
local waiting = {}

AddEventHandler('ai-core:client:keybindKey', function(owner, name, key)
    if owner == resource and type(key) == 'string' and waiting[name] then waiting[name](key) end
end)

---@class AiLibKeybindOptions
---@field name string stable id without the key (`myscript_open`)
---@field description string shown in GTA's key settings and the panel (a lang text)
---@field defaultKey? string
---@field defaultMapper? string `keyboard` (default), `MOUSE_BUTTON`, `PAD_DIGITALBUTTON`
---@field allowInPauseMenu? boolean
---@field disabled? boolean
---@field hint? 'foot'|'vehicle'|'always' HUDs list the key in their key hints then (the owner can change it in the panel)
---@field icon? string Font Awesome solid icon name next to the hint
---@field hintLabel? string short hint text (a lang text); `description` when absent
---@field onPressed? fun()
---@field onReleased? fun()

---@class AiLibKeybind
---@field name string
---@field disabled boolean
---@field isPressed boolean
---@field private options AiLibKeybindOptions
---@field private command string
---@field private registered table<string, boolean>
local Keybind = {}
Keybind.__index = Keybind

---@param options AiLibKeybindOptions
---@return AiLibKeybind
function Keybind.new(options)
    local self = setmetatable({
        name = options.name,
        disabled = options.disabled == true,
        isPressed = false,
        options = options,
        command = '',
        registered = {},
    }, Keybind)
    local answered = false
    waiting[options.name] = function(key)
        answered = true
        self:register(key:upper())
    end
    if GetResourceState('ai-core') == 'started' then
        TriggerEvent('ai-core:client:keybind', {
            resource = resource,
            name = options.name,
            description = options.description,
            defaultKey = options.defaultKey or '',
            mapper = options.defaultMapper or 'keyboard',
            hint = options.hint,
            icon = options.icon,
            hintLabel = options.hintLabel,
        })
    end
    -- ai-core answers within one server round trip; never leave a key unbound.
    SetTimeout(GetResourceState('ai-core') == 'started' and 15000 or 0, function()
        if not answered then self:register((options.defaultKey or ''):upper()) end
    end)
    return self
end

---Registers the mapping of a key; a later key (a panel change) gets its own mapping and the old one stops acting.
---@param key string
function Keybind:register(key)
    local command = key ~= '' and ('%s_%s'):format(self.name, key) or self.name
    if command == self.command then return end
    self.command = command
    if self.registered[command] then return end
    self.registered[command] = true
    RegisterCommand('+' .. command, function()
        if command == self.command then self:press(true) end
    end, false)
    RegisterCommand('-' .. command, function()
        if command == self.command then self:press(false) end
    end, false)
    RegisterKeyMapping('+' .. command, self.options.description, self.options.defaultMapper or 'keyboard', key)
    SetTimeout(500, function()
        TriggerEvent('chat:removeSuggestion', '/+' .. command)
        TriggerEvent('chat:removeSuggestion', '/-' .. command)
    end)
end

---@param down boolean
function Keybind:press(down)
    if self.disabled or (not self.options.allowInPauseMenu and IsPauseMenuActive()) then return end
    self.isPressed = down
    local handler = down and self.options.onPressed or self.options.onReleased
    if handler then handler() end
end

---@param disabled boolean
function Keybind:disable(disabled)
    self.disabled = disabled
end

return Keybind
