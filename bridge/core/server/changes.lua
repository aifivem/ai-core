-- ai-core's framework bridge, server side: the mirror follows ai-core's local delta events (money, metadata, jobs,
-- duty, gangs, definitions) and tells the framework parts.

local core = Bridge.core
local emitChange, setOnDuty = Bridge.emit, Bridge.setOnDuty

AddEventHandler('ai-core:moneyChanged', function(source, account, balance, delta, reason)
    local mirror = Bridge.players[source]
    if not mirror then return end
    mirror.money[account] = balance
    emitChange('money', source, account, balance, delta, reason)
end)

AddEventHandler('ai-core:metaChanged', function(source, key, value)
    local mirror = Bridge.players[source]
    if not mirror then return end
    mirror.metadata[key] = value
    emitChange('meta', source, key, value)
end)

---@param source integer
local function jobChanged(source)
    local mirror = Bridge.players[source]
    if not mirror then return end
    mirror.job = core:GetCurrentJob(source) or mirror.job
    emitChange('job', source, Bridge.jobOf(mirror))
end

AddEventHandler('ai-core:jobsChanged', function(source, jobs)
    local mirror = Bridge.players[source]
    if not mirror then return end
    mirror.jobs = jobs or {}
    jobChanged(source)
end)

AddEventHandler('ai-core:dutyChanged', function(source, job)
    local mirror = Bridge.players[source]
    if not mirror then return end
    setOnDuty(mirror.duty, source, false)
    setOnDuty(job, source, true)
    mirror.duty = job
    jobChanged(source)
end)

---@param source integer
local function gangChanged(source)
    local mirror = Bridge.players[source]
    if not mirror then return end
    emitChange('gang', source, Bridge.gangOf(mirror))
end

-- A panel edit of a job or gang reaches the players who hold it (labels, grades, salaries).
AddEventHandler('ai-core:definitionsChanged', function(file, name)
    Bridge.forgetDefinitions(file)
    for source, mirror in pairs(Bridge.players) do
        if file == 'jobs' and mirror.job.job == name then jobChanged(source)
        elseif file == 'gangs' and mirror.activeGang == name then gangChanged(source) end
    end
end)

AddEventHandler('ai-core:gangsChanged', function(source, gangs)
    local mirror = Bridge.players[source]
    if not mirror then return end
    mirror.gangs = gangs or {}
    gangChanged(source)
end)

AddEventHandler('ai-core:activeGangChanged', function(source, gang)
    local mirror = Bridge.players[source]
    if not mirror then return end
    mirror.activeGang = gang
    gangChanged(source)
end)
