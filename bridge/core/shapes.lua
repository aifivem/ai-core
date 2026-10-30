-- The framework shapes both bridge sides hand out (loaded on the server and the client before the framework parts):
-- ai-core's job / gang view (`Bridge.jobOf` / `BridgeClient`) as QB's and ESX's job tables, and Qbox's group match.

---@class BridgeShapes
BridgeShapes = {}

---@param job BridgeJob
---@return QBJob
function BridgeShapes.qbJob(job)
    return { name = job.name, label = job.label, type = job.type, payment = job.salary, onduty = job.onDuty, isboss = job.boss, grade = { name = job.gradeLabel, level = job.grade } }
end

---@param gang { name: string, label: string, grade: integer, gradeLabel: string, boss: boolean }
---@return QBGang
function BridgeShapes.qbGang(gang)
    return { name = gang.name, label = gang.label, isboss = gang.boss, grade = { name = gang.gradeLabel, level = gang.grade } }
end

---@param job BridgeJob
---@return ESXJob
function BridgeShapes.esxJob(job)
    return { id = 0, name = job.name, label = job.label, grade = job.grade, grade_name = (job.gradeLabel:lower():gsub('%s+', '_')), grade_label = job.gradeLabel, grade_salary = job.salary, skin_male = {}, skin_female = {}, onDuty = job.onDuty }
end

--- Qbox's group filter: a name, a list of names or `{ [name] = minGrade }`; the first matching group and its grade.
---@param groups table<string, integer>
---@param filter string|string[]|table<string, integer>
---@return string|nil, integer|nil
function BridgeShapes.matchGroup(groups, filter)
    if type(filter) == 'string' then
        if groups[filter] then return filter, groups[filter] end
        return
    end
    for key, value in pairs(filter) do
        local name, min = tostring(type(key) == 'number' and value or key), type(key) == 'number' and 0 or value
        if groups[name] and groups[name] >= min then return name, groups[name] end
    end
end
