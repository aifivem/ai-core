-- QBCore on ai-core, client UI: QBCore.Functions.Progressbar and the `progressbar` resource, drawn by ai-lib's
-- progress bar through bridge/core/client/progress.lua.

local RESOURCE = GetCurrentResourceName()
local F = QBCore.Functions

---@class QBProgressAction
---@field name? string
---@field duration integer
---@field label string
---@field useWhileDead? boolean
---@field canCancel? boolean
---@field controlDisables? { disableMovement?: boolean, disableCarMovement?: boolean, disableMouse?: boolean, disableCombat?: boolean }
---@field animation? { animDict?: string, anim?: string, flags?: integer, task?: string }

---@param action QBProgressAction
---@param owner string
---@param done fun(cancelled: boolean)
---@return boolean
local function progress(action, owner, done)
    local animation = type(action.animation) == 'table' and action.animation or {}
    return BridgeUI.progress({
        label = action.label or '',
        duration = tonumber(action.duration) or 0,
        owner = owner,
        canCancel = action.canCancel == true,
        whileDead = action.useWhileDead == true,
        disable = type(action.controlDisables) == 'table' and action.controlDisables or nil,
        anim = animation.animDict and { dict = animation.animDict, clip = animation.anim, flag = animation.flags } or nil,
        scenario = animation.task,
        onDone = done,
    })
end

--- qb-core's progress bar (props are not attached).
---@param _name string
---@param label string
---@param duration integer
---@param useWhileDead? boolean
---@param canCancel? boolean
---@param disableControls? table
---@param animation? table
---@param _prop? table
---@param _propTwo? table
---@param onFinish? function
---@param onCancel? function
function F.Progressbar(_name, label, duration, useWhileDead, canCancel, disableControls, animation, _prop, _propTwo, onFinish, onCancel)
    progress({
        label = label,
        duration = duration,
        useWhileDead = useWhileDead,
        canCancel = canCancel,
        controlDisables = disableControls,
        animation = animation,
    }, GetInvokingResource() or RESOURCE, function(cancelled) BridgeUI.call(cancelled and onCancel or onFinish) end)
end

BridgeClient.provideExport('progressbar', 'Progress', function(action, finish)
    if type(action) ~= 'table' then return end
    progress(action, GetInvokingResource() or RESOURCE, function(cancelled) BridgeUI.call(finish, cancelled) end)
end)
BridgeClient.provideExport('progressbar', 'isDoingSomething', function() return BridgeUI.isProgressRunning() end)
RegisterNetEvent('progressbar:client:cancel', function() BridgeUI.cancelProgress() end)
