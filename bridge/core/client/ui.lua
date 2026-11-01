-- ai-core's framework bridge, client UI: creates `BridgeUI`, the framework menus, text prompts and progress bars of
-- ESX, QB and vRP drawn by ai-lib's shared menu / input dialog, prompts and progress bar (no NUI of the bridge's own):
-- dialogs.lua, prompts.lua, progress.lua. Here: callback calls and framework text made plain.

local RESOURCE = GetCurrentResourceName()

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

--- Framework text made plain for ai-lib's UI: HTML tags and GTA colour codes (`~r~`) removed.
---@param text any
---@return string
function BridgeUI.clean(text)
    return aiLib.stripGameText(text)
end

--- A Font Awesome class list (`fas fa-scroll`) as ai-lib's menu icon name (`scroll`); nil without one.
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
