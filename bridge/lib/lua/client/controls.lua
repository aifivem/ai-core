-- Disabled controls of this resource: one per-frame scheduler job for every reason, running only while any reason holds.
local sets = {}
local flat = {}
---Reasons that disable every control, each with the controls it keeps.
local all = {}
local allCount = 0
---Controls every `disableAll` reason keeps (and no `disable` reason takes).
local kept = {}

local frame = aiLib.every(0, function()
    if allCount > 0 then
        DisableAllControlActions(0)
        DisableAllControlActions(1)
        DisableAllControlActions(2)
        for i = 1, #kept do EnableControlAction(0, kept[i], true) end
    end
    for i = 1, #flat, 2 do DisableControlAction(flat[i], flat[i + 1], true) end
end, { active = false, name = 'controls' })

---@param list integer[]
---@param control integer
---@return boolean
local function has(list, control)
    for _, c in ipairs(list) do
        if c == control then return true end
    end
    return false
end

local function rebuild()
    flat = {}
    local taken = {}
    for _, set in pairs(sets) do
        for _, control in ipairs(set.controls) do
            flat[#flat + 1] = set.group
            flat[#flat + 1] = control
            if set.group == 0 then taken[control] = true end
        end
    end
    kept, allCount = {}, 0
    local first
    for _, except in pairs(all) do
        allCount = allCount + 1
        first = first or except
    end
    for _, control in ipairs(first or {}) do
        local everyone = not taken[control]
        for _, except in pairs(all) do everyone = everyone and has(except, control) end
        if everyone then kept[#kept + 1] = control end
    end
    frame:set(#flat > 0 or allCount > 0)
end

return {
    ---Disables `controls` (input group `group`, default 0) every frame until `enable(reason)`.
    ---@param reason string
    ---@param controls integer[]
    ---@param group? integer
    disable = function(reason, controls, group)
        sets[reason] = { group = group or 0, controls = controls }
        rebuild()
    end,
    ---Disables every control (input groups 0-2) every frame until `enable(reason)`, except `except` (group 0).
    ---@param reason string
    ---@param except? integer[]
    disableAll = function(reason, except)
        all[reason] = except or {}
        rebuild()
    end,
    ---@param reason string
    enable = function(reason)
        if sets[reason] == nil and all[reason] == nil then return end
        sets[reason] = nil
        all[reason] = nil
        rebuild()
    end,
}
