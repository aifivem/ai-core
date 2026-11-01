-- Qbox job / gang definitions on the server and qbx_core's onJobUpdate / onGangUpdate for panel edits.

---@type { jobs: table<string, QboxJob>|nil, gangs: table<string, QboxGang>|nil }
local definitions = {}

---@return table<string, QboxJob>
local function qboxJobs()
    definitions.jobs = definitions.jobs or BridgeQbox.jobs(Bridge.jobDefinitions())
    return definitions.jobs
end

---@return table<string, QboxGang>
local function qboxGangs()
    definitions.gangs = definitions.gangs or BridgeQbox.gangs(Bridge.gangDefinitions())
    return definitions.gangs
end

-- A panel edit of a job or gang is qbx_core's CreateJob / UpsertJobData etc.: the same events, nil when deleted.
AddEventHandler('ai-core:definitionsChanged', function(file, name)
    if file == 'jobs' then
        definitions.jobs = nil
        TriggerEvent('qbx_core:server:onJobUpdate', name, qboxJobs()[name])
    elseif file == 'gangs' then
        definitions.gangs = nil
        TriggerEvent('qbx_core:server:onGangUpdate', name, qboxGangs()[name])
    end
end)

BridgeQbox.qboxJobs = qboxJobs
BridgeQbox.qboxGangs = qboxGangs
