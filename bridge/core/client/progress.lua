-- ai-core's framework bridge, client UI: the frameworks' progress bars on ai-lib's progress.

local RESOURCE = GetCurrentResourceName()

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

--- Runs a timed action with ai-lib's progress (its bar; the frameworks' progress bars); false while one runs.
--- The cancel key is ai-lib's (`aicore_cancel_progress`), the same one every resource's progress uses.
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

-- A stopped resource takes its progress with it, without calling back into it.
AddEventHandler('onClientResourceStop', function(resource)
    if resource == RESOURCE then return end
    if running and running.options.owner == resource then
        running.silent = true
        aiLib.progress.cancel()
    end
end)
