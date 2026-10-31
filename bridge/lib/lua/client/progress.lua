-- Timed actions with ai-core's progress bar, like the TypeScript lib's `progress`: one at a time per resource, an
-- optional animation or scenario, blocked controls through the resource's one `controls` job.

---Controls each `disable` flag blocks while a progress runs.
local DISABLED = {
    move = { 30, 31, 36, 21, 44 },
    car = { 63, 64, 71, 72, 75 },
    mouse = { 1, 2, 106 },
    combat = { 24, 25, 37, 47, 58, 140, 141, 142, 143, 257, 263, 264 },
}

---@class AiLibProgressOptions
---@field label string
---@field duration integer ms
---@field anim? { dict: string, clip: string, flag?: integer }
---@field scenario? string played in place when there is no `anim`
---@field allowVehicle? boolean getting into a vehicle cancels it unless true
---@field canCancel? boolean the player may cancel it with ai-core's cancel key (default false)
---@field whileDead? boolean keeps running when the player dies (default false)
---@field freeze? boolean holds the player in place
---@field disable? { move?: boolean, car?: boolean, mouse?: boolean, combat?: boolean }

---@type { canCancel: boolean, cancelled: boolean }|nil
local running = nil

AddEventHandler('ai-lib:client:cancelProgress', function()
    if running and running.canCancel then running.cancelled = true end
end)

---@class AiLibProgress
---@overload fun(options: AiLibProgressOptions): boolean
local progress = {}

---Cancels this resource's running progress (whether or not the player may).
function progress.cancel()
    if running then running.cancelled = true end
end

---@return boolean
function progress.isRunning()
    return running ~= nil
end

---Runs a timed action; waits and returns true when it ran out, false when cancelled (death, a vehicle, the cancel key,
---`progress.cancel()`) or while another one of this resource runs. Checks ten times a second.
---@param options AiLibProgressOptions
---@return boolean
local function run(options)
    if running then return false end
    local own = { canCancel = options.canCancel == true, cancelled = false }
    running = own
    local cache = aiLib.cache
    local ped = cache.ped
    local anim = options.anim
    if anim and aiLib.requestAnimDict(anim.dict) then
        TaskPlayAnim(ped, anim.dict, anim.clip, 3.0, 3.0, options.duration, anim.flag or 49, 0, false, false, false)
    elseif not anim and options.scenario then
        TaskStartScenarioInPlace(ped, options.scenario, 0, true)
    end
    if options.freeze then FreezeEntityPosition(ped, true) end
    local blocked = {}
    for key, list in pairs(DISABLED) do
        if options.disable and options.disable[key] then
            for i = 1, #list do blocked[#blocked + 1] = list[i] end
        end
    end
    if #blocked > 0 then aiLib.controls.disable('progress', blocked) end
    exports['ai-lib']:ShowProgress(options.label, options.duration)
    local finish = GetGameTimer() + options.duration
    local done = true
    while GetGameTimer() < finish do
        if own.cancelled or (not options.whileDead and IsEntityDead(cache.ped)) or (not options.allowVehicle and cache.vehicle) then
            done = false
            break
        end
        Wait(100)
    end
    if anim then StopAnimTask(ped, anim.dict, anim.clip, 1.0) elseif options.scenario then ClearPedTasks(ped) end
    if options.freeze then FreezeEntityPosition(ped, false) end
    if #blocked > 0 then aiLib.controls.enable('progress') end
    exports['ai-lib']:HideProgress()
    running = nil
    return done
end

return setmetatable(progress, { __call = function(_, options) return run(options) end })
