-- One scheduler thread per resource, like the TypeScript lib's `every`: every periodic job (per-frame work, fixed
-- interval checks) runs from it. The thread sleeps until the next job is due and ends while no job is active. A job
-- must not `Wait` (it would hold every other job): start a thread from it for that.

local resource = GetCurrentResourceName()
local ERROR_LOG_MS = 10000
---@type AiLibJob[] active (and just switched off) jobs in switch-on order
local jobs = {}
---Generation of the thread that should run; a thread of an older generation ends when it wakes.
local current = 0
local alive = false
local wakeAt = math.huge

---@param job AiLibJob
---@param err any
local function report(job, err)
    local now = GetGameTimer()
    if now < job.quietUntil then
        job.skipped = job.skipped + 1
        return
    end
    job.quietUntil = now + ERROR_LOG_MS
    local more = job.skipped > 0 and (' (+%d more)'):format(job.skipped) or ''
    job.skipped = 0
    print(('^1[%s] job "%s" failed%s: %s^0'):format(resource, job.name, more, tostring(err)))
end

---@param gen integer
local function loop(gen)
    while gen == current do
        local now = GetGameTimer()
        -- Jobs switched on during this pass are appended and wait for the next one.
        for i = 1, #jobs do
            local job = jobs[i]
            if job.running and now >= job.next then
                local nextAt = job.next + job.ms
                if nextAt <= now then nextAt = now + job.ms end
                job.next = nextAt
                local ok, err = xpcall(job.fn, debug.traceback)
                if not ok then report(job, err) end
            end
        end
        local kept, soonest = 0, math.huge
        for i = 1, #jobs do
            local job = jobs[i]
            if job.running then
                kept = kept + 1
                jobs[kept] = job
                if job.next < soonest then soonest = job.next end
            else
                job.listed = false
            end
        end
        for i = #jobs, kept + 1, -1 do jobs[i] = nil end
        if gen ~= current then return end
        if kept == 0 then
            alive, wakeAt = false, math.huge
            return
        end
        wakeAt = soonest
        Wait(math.max(0, soonest - GetGameTimer()))
    end
end

---@class AiLibJob
---@field running boolean true while switched on
---@field ms integer
---@field fn fun()
---@field name string
---@field next integer
---@field listed boolean
---@field stopped boolean
---@field quietUntil integer
---@field skipped integer
local Job = {}
Job.__index = Job

---Switches the job on (first run one interval later; next frame for 0) or off.
---@param active boolean
function Job:set(active)
    if active == self.running or (active and self.stopped) then return end
    self.running = active
    if not active then return end
    self.next = GetGameTimer() + self.ms
    if not self.listed then
        self.listed = true
        jobs[#jobs + 1] = self
    end
    if not alive or self.next < wakeAt then
        current = current + 1
        alive, wakeAt = true, self.next
        local gen = current
        CreateThread(function() loop(gen) end)
    end
end

---Switches the job off for good (`set(true)` does nothing afterwards).
function Job:stop()
    self:set(false)
    self.stopped = true
end

---Runs `fn` every `ms` milliseconds (0 = every frame) from the resource's one scheduler thread. A failing job is logged
---with its name (at most once per 10 s) and keeps running; the others are not affected.
---@param ms integer
---@param fn fun()
---@param options? { active?: boolean, name?: string }
---@return AiLibJob
return function(ms, fn, options)
    options = options or {}
    local job = setmetatable({
        running = false,
        ms = math.max(0, math.floor(ms)),
        fn = fn,
        name = options.name or 'anonymous',
        next = 0,
        listed = false,
        stopped = false,
        quietUntil = 0,
        skipped = 0,
    }, Job)
    if options.active ~= false then job:set(true) end
    return job
end
