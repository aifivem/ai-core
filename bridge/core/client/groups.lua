-- ai-core's framework bridge, client side: the job and gang a framework script sees (ai-core's current job and active
-- gang), built from ai-core's values (`BridgeClient.raw`, written by mirror.lua) and the job / gang definitions of
-- ai-core's client.

local emitChange = BridgeClient.emit

--- ai-core's values the job and gang views are built from.
---@type { jobs: { job: string, grade: integer }[], duty: string|nil, job: { job: string, grade: integer }|nil, gangs: { gang: string, grade: integer }[], activeGang: string|nil }
BridgeClient.raw = { jobs = {}, duty = nil, job = nil, gangs = {}, activeGang = nil }
local raw = BridgeClient.raw

--- Every job and gang membership by name with its grade (Qbox's client GetGroups).
---@return table<string, integer>
function BridgeClient.groups()
    local out = {}
    for _, m in ipairs(raw.jobs) do out[m.job] = m.grade end
    for _, m in ipairs(raw.gangs) do out[m.gang] = m.grade end
    return out
end

--- Job and gang definitions from ai-core's client (panel files), read once and kept by its change event.
---@type table<string, table>
local definitions = {}

---@param file 'jobs'|'gangs'
---@return table<string, table>
local function definitionsOf(file)
    local list = definitions[file]
    if not list then
        list = exports['ai-core']:GetDefinitions(file) or {}
        definitions[file] = list
    end
    return list
end

--- The job a framework script sees (ai-core's current job), in the same shape as the server part's `Bridge.jobOf`.
local function jobView()
    local pick = raw.job or { job = 'unemployed', grade = 0 }
    local definition = definitionsOf('jobs')[pick.job]
    local grade = definition and definition.grades and definition.grades[pick.grade + 1]
    return {
        name = pick.job,
        label = definition and definition.label or pick.job,
        type = definition and definition.type or 'none',
        grade = pick.grade,
        gradeLabel = grade and grade.label or 'Freelancer',
        salary = grade and grade.salary or 0,
        boss = grade ~= nil and grade.boss == true,
        onDuty = raw.duty == pick.job,
    }
end

local function gangView()
    local pick
    for i = 1, #raw.gangs do
        if raw.gangs[i].gang == raw.activeGang then pick = raw.gangs[i] break end
    end
    if not pick then return { name = 'none', label = 'No Gang', grade = 0, gradeLabel = 'None', boss = false } end
    local definition = definitionsOf('gangs')[pick.gang]
    local grade = definition and definition.grades and definition.grades[pick.grade + 1]
    return { name = pick.gang, label = definition and definition.label or pick.gang, grade = pick.grade, gradeLabel = grade and grade.label or 'Member', boss = grade ~= nil and grade.boss == true }
end

---@param a table|nil
---@param b table
local function same(a, b)
    if not a then return false end
    for key, value in pairs(b) do
        if a[key] ~= value then return false end
    end
    return true
end

local function refreshJob()
    if not BridgeClient.loaded then return end
    local view = jobView()
    if same(BridgeClient.job, view) then return end
    local last = BridgeClient.job
    BridgeClient.job = view
    emitChange('job', view, last)
end

local function refreshGang()
    if not BridgeClient.loaded then return end
    local view = gangView()
    if same(BridgeClient.gang, view) then return end
    BridgeClient.gang = view
    emitChange('gang', view)
end

AddEventHandler('ai-core:client:definitions', function(file, name, value)
    local list = definitions[file]
    if list then list[name] = value end
    if file == 'jobs' then refreshJob() else refreshGang() end
end)

BridgeClient.jobView, BridgeClient.gangView = jobView, gangView
BridgeClient.refreshJob, BridgeClient.refreshGang = refreshJob, refreshGang
