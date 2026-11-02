-- qbx_smallresources' client exports (ai-core provides the name): GTA HUD components, controls and the ammo count
-- other scripts switch off. Listed components hide per frame only while any is listed or the ammo count is off;
-- controls go through ai-lib's `controls` (one per-frame job while any is listed). The lists start empty: GTA's own
-- HUD parts are hidden by ai-smallresources' panel setting.

local RESOURCE = 'qbx_smallresources'
---@type integer[]
local components = {}
---@type integer[]
local disabled = {}
local displayAmmo = true

local frame = aiLib.every(0, function()
    for i = 1, #components do HideHudComponentThisFrame(components[i]) end
    if not displayAmmo then DisplayAmmoThisFrame(false) end
end, { active = false, name = 'hudcomponents' })

local function refresh()
    frame:set(#components > 0 or not displayAmmo)
    if #disabled > 0 then
        aiLib.controls.disable(RESOURCE, table.move(disabled, 1, #disabled, 1, {}), 2)
    else
        aiLib.controls.enable(RESOURCE)
    end
end

--- A number or an array of numbers as whole ids.
---@param value any
---@return integer[]
local function idsOf(value)
    local out = {}
    local list = type(value) == 'table' and value or { value }
    for i = 1, #list do
        local id = math.tointeger(tonumber(list[i]))
        if id and id >= 0 then out[#out + 1] = id end
    end
    return out
end

---@param list integer[]
---@param value any
local function add(list, value)
    for _, id in ipairs(idsOf(value)) do
        local found = false
        for i = 1, #list do found = found or list[i] == id end
        if not found then list[#list + 1] = id end
    end
    refresh()
end

---@param list integer[]
---@param value any
local function remove(list, value)
    for _, id in ipairs(idsOf(value)) do
        for i = #list, 1, -1 do
            if list[i] == id then table.remove(list, i) end
        end
    end
    refresh()
end

---@param list integer[]
---@return integer[]
local function copy(list) return table.move(list, 1, #list, 1, {}) end

local exportsOf = {
    AddDisableHudComponents = function(value) add(components, value) end,
    RemoveDisableHudComponents = function(value) remove(components, value) end,
    GetDisableHudComponents = function() return copy(components) end,
    AddDisableControls = function(value) add(disabled, value) end,
    RemoveDisableControls = function(value) remove(disabled, value) end,
    GetDisableControls = function() return copy(disabled) end,
    SetDisplayAmmo = function(on)
        displayAmmo = on ~= false
        refresh()
    end,
    GetDisplayAmmo = function() return displayAmmo end,
}

for name, fn in pairs(exportsOf) do
    BridgeClient.provideExport(RESOURCE, name, fn)
    -- Qbox's deprecated lowercase names.
    BridgeClient.provideExport(RESOURCE, name:sub(1, 1):lower() .. name:sub(2), fn)
end
