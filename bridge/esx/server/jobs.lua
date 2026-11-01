-- ESX on ai-core, server side: ESX.Jobs and the job functions, from ai-core's job definitions; ESX.CreateJob as an
-- ai-core runtime definition of the calling script.

--- ESX's job table from ai-core's job definitions (grades keyed '0', '1'...; `whitelisted` = not listed in the panel).
---@return table<string, table>
local function buildJobs()
    local out = {}
    for name, definition in pairs(Bridge.jobDefinitions()) do
        local grades = {}
        for i, grade in ipairs(definition.grades) do
            grades[tostring(i - 1)] = {
                job_name = name, grade = i - 1, name = (grade.label:lower():gsub('%s+', '_')), label = grade.label,
                salary = grade.salary, skin_male = '{}', skin_female = '{}',
            }
        end
        -- The panel's "listed in the job center" switch: esx_joblisting shows exactly the jobs that are not whitelisted.
        out[name] = { name = name, label = definition.label, type = definition.type, whitelisted = definition.listed ~= true, grades = grades }
    end
    return out
end

---@param jobType? string|string[]
---@return table<string, table>
function ESX.GetJobs(jobType)
    if not jobType then return ESX.Jobs end
    local wanted = {}
    for _, t in ipairs(type(jobType) == 'table' and jobType or { jobType }) do wanted[t] = true end
    local out = {}
    for name, job in pairs(ESX.Jobs) do
        if wanted[job.type] then out[name] = job end
    end
    return out
end

---@param job string
---@param grade integer|string
---@return boolean
function ESX.DoesJobExist(job, grade)
    local definition = Bridge.jobDefinitions()[job]
    return definition ~= nil and definition.grades[(tonumber(grade) or 0) + 1] ~= nil
end

--- Jobs are panel content on ai-core (ai-core keeps ESX.Jobs current after every panel edit): this reads them again.
function ESX.RefreshJobs()
    ESX.Jobs = buildJobs()
    TriggerEvent('esx:jobsRefreshed')
end

---@param jobName string
---@return boolean
function ESX.RefreshJob(jobName)
    if type(jobName) ~= 'string' or jobName == '' then return false end
    ESX.Jobs = buildJobs()
    local job = ESX.Jobs[jobName]
    if not job then return false end
    TriggerEvent('esx:jobRefreshed', jobName, job)
    return true
end

--- A job of the calling script as an ai-core runtime definition (gone when that script stops; listed in job centers,
--- as ESX's `whitelisted` 0). Grades `{ grade, name, label, salary }`; a job the script made before only gets the grades
--- it lacks, as in ESX. ai-core's panel jobs are not changed from here.
---@param name string
---@param label string
---@param grades { grade: integer, name?: string, label?: string, salary?: number }[]
---@param jobType? string
---@return boolean
function ESX.CreateJob(name, label, grades, jobType)
    local owner = GetInvokingResource() or 'ai-core'
    ---@param why string
    ---@return false
    local function refuse(why)
        print(('[^3WARNING^7] [ai-core ESX bridge] ESX.CreateJob(%s) from %s: %s'):format(tostring(name), owner, why))
        return false
    end
    if type(name) ~= 'string' or name == '' then return refuse('missing argument `name`') end
    if type(label) ~= 'string' or label == '' then return refuse('missing argument `label`') end
    if type(grades) ~= 'table' or not next(grades) then return refuse('missing argument `grades`') end
    local mine = Bridge.scriptDefinition('job', name)
    if not mine and Bridge.definitionExists('job', name) then return refuse('the job exists in ai-core\'s admin panel or belongs to another script') end
    local definition = { label = label, type = type(jobType) == 'string' and jobType or 'civ', defaultDuty = true, listed = true, grades = {} }
    if mine then
        definition.label, definition.type = mine.definition.label, mine.definition.type
        for grade, entry in pairs(mine.definition.grades) do definition.grades[grade] = entry end
    end
    local added = false
    for _, grade in pairs(grades) do
        local number = type(grade) == 'table' and Bridge.gradeNumber(grade.grade) or nil
        if not number then return refuse('every grade needs a `grade` number from 0 to 99') end
        if definition.grades[number] == nil then
            local gradeLabel = grade.label or grade.name
            definition.grades[number] = { label = type(gradeLabel) == 'string' and gradeLabel or ('Grade %d'):format(number), salary = math.max(0, math.floor(tonumber(grade.salary) or 0)), boss = grade.name == 'boss' }
            added = true
        end
    end
    if not added then return refuse('the job and its grades exist already') end
    local ok, err = Bridge.putDefinition('job', name, definition, owner)
    if not ok then return refuse(('ai-core refused it (%s)'):format(tostring(err))) end
    ESX.Jobs = buildJobs()
    TriggerEvent('esx:jobCreated', name, ESX.Jobs[name])
    return true
end

-- ESX.Jobs follows ai-core's job definitions.
AddEventHandler('ai-core:definitionsChanged', function(file, name)
    if file ~= 'jobs' then return end
    ESX.Jobs = buildJobs()
    if ESX.Jobs[name] then TriggerEvent('esx:jobRefreshed', name, ESX.Jobs[name])
    else TriggerEvent('esx:jobRemoved', name, 'missing job') end
end)

CreateThread(function()
    ESX.Jobs = buildJobs()
end)
