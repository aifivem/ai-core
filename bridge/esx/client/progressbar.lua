-- ESX on ai-core, client UI: esx_progressbar (ESX.Progressbar) on ai-core's progress (bridge/core/client/progress.lua).

local RESOURCE = GetCurrentResourceName()

---@class ProgressBarOptions
---@field FreezePlayer? boolean
---@field animation? { type: 'anim'|'Scenario', dict?: string, lib?: string, Scenario?: string }
---@field onFinish? function
---@field onCancel? function

---@param message string
---@param length? integer ms
---@param options? ProgressBarOptions
---@return boolean
function ESX.Progressbar(message, length, options)
    options = type(options) == 'table' and options or {}
    local animation = type(options.animation) == 'table' and options.animation or {}
    return BridgeUI.progress({
        label = message or '',
        duration = tonumber(length) or 3000,
        owner = GetInvokingResource() or RESOURCE,
        whileDead = true,
        freeze = options.FreezePlayer == true,
        anim = animation.type == 'anim' and animation.dict and { dict = animation.dict, clip = animation.lib, flag = 1 } or nil,
        scenario = animation.type == 'Scenario' and animation.Scenario or nil,
        onDone = function(cancelled) BridgeUI.call(cancelled and options.onCancel or options.onFinish) end,
    })
end

function ESX.CancelProgressbar() BridgeUI.cancelProgress(true) end
