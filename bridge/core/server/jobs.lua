-- ai-core's framework bridge, server side: ai-core's job and gang definitions (panel content, read once and dropped
-- when one changes) and the job / gang a framework script sees.

local core = Bridge.core

---@class AiGrade
---@field label string
---@field salary number
---@field boss boolean

---@class AiJobDefinition
---@field label string
---@field type string
---@field defaultDuty boolean
---@field listed boolean listed in job centers (panel switch); ESX `whitelisted` is its opposite
---@field grades AiGrade[]

---@class BridgeJob
---@field name string
---@field label string
---@field type string
---@field grade integer
---@field gradeLabel string
---@field salary number
---@field boss boolean
---@field onDuty boolean

--- ai-core's job and gang definitions (panel content): read once, dropped when the panel changes one.
---@type { jobs: table<string, AiJobDefinition>|nil, gangs: table<string, { label: string, grades: AiGrade[] }>|nil }
local definitions = {}

---@return table<string, AiJobDefinition>
function Bridge.jobDefinitions()
    definitions.jobs = definitions.jobs or core:GetJobDefinitions() or {}
    return definitions.jobs
end

---@return table<string, { label: string, grades: AiGrade[] }>
function Bridge.gangDefinitions()
    definitions.gangs = definitions.gangs or core:GetGangDefinitions() or {}
    return definitions.gangs
end

--- Drops the kept definitions of a panel file (`jobs` / `gangs`); they are read again on the next use.
---@param file string
function Bridge.forgetDefinitions(file)
    definitions[file] = nil
end

--- The job a framework script sees: ai-core's current job (`GetCurrentJob`) with its definition.
---@param mirror { job: AiJobMembership, duty?: string } a mirror, or a stored character's pick
---@return BridgeJob
function Bridge.jobOf(mirror)
    local pick = mirror.job
    local definition = Bridge.jobDefinitions()[pick.job]
    local grade = definition and definition.grades[pick.grade + 1] or { label = 'Freelancer', salary = 0, boss = false }
    return {
        name = pick.job,
        label = definition and definition.label or pick.job,
        type = definition and definition.type or 'none',
        grade = pick.grade,
        gradeLabel = grade.label,
        salary = grade.salary,
        boss = grade.boss,
        onDuty = mirror.duty == pick.job,
    }
end

--- The active gang, else none.
---@param mirror { gangs: AiGangMembership[], activeGang?: string } a mirror or a stored character
---@return { name: string, label: string, grade: integer, gradeLabel: string, boss: boolean }
function Bridge.gangOf(mirror)
    local pick
    for i = 1, #mirror.gangs do
        if mirror.gangs[i].gang == mirror.activeGang then pick = mirror.gangs[i] break end
    end
    if not pick then return { name = 'none', label = 'No Gang', grade = 0, gradeLabel = 'None', boss = false } end
    local definition = Bridge.gangDefinitions()[pick.gang]
    local grade = definition and definition.grades[pick.grade + 1] or { label = 'Member', boss = false }
    return { name = pick.gang, label = definition and definition.label or pick.gang, grade = pick.grade, gradeLabel = grade.label, boss = grade.boss }
end
