-- The framework shapes both bridge sides hand out (loaded on the server and the client before the framework parts):
-- ai-core's job / gang view (`Bridge.jobOf` / `BridgeClient`) as QB's and ESX's job tables, QB's job / gang / item
-- definitions, and Qbox's group match.

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

--- QB's job definition (`QBCore.Shared.Jobs[name]`) from an ai-core one (grades keyed by their index as text).
---@param definition AiJobDefinition
---@return table
function BridgeShapes.qbJobDefinition(definition)
    local grades = {}
    for i, grade in ipairs(definition.grades or {}) do grades[tostring(i - 1)] = { name = grade.label, payment = grade.salary, isboss = grade.boss, bankAuth = grade.boss } end
    return { label = definition.label, type = definition.type, defaultDuty = definition.defaultDuty, offDutyPay = false, grades = grades }
end

--- QB's gang definition (`QBCore.Shared.Gangs[name]`).
---@param definition { label: string, grades: AiGrade[] }
---@return table
function BridgeShapes.qbGangDefinition(definition)
    local grades = {}
    for i, grade in ipairs(definition.grades or {}) do grades[tostring(i - 1)] = { name = grade.label, isboss = grade.boss, bankAuth = grade.boss } end
    return { label = definition.label, grades = grades }
end

--- QB's item (`QBCore.Shared.Items[name]`) from an ai-core item definition.
---@param name string
---@param definition { label: string, weight: number, unique: boolean, close: boolean, description: string }
---@return table
function BridgeShapes.qbItem(name, definition)
    return {
        name = name,
        label = definition.label,
        weight = definition.weight,
        type = 'item',
        image = ('%s.png'):format(name),
        unique = definition.unique,
        useable = true,
        shouldClose = definition.close,
        description = definition.description,
    }
end

---@type table<string, table>
local sharedFiles = {}

--- A data file copied from qbx_core (`shared/vehicles.lua`, `shared/weapons.lua`), loaded once per side.
---@param name 'vehicles'|'weapons'
---@return table
function BridgeShapes.sharedData(name)
    local data = sharedFiles[name]
    if data then return data end
    local chunk, err = load(LoadResourceFile(GetCurrentResourceName(), ('shared/%s.lua'):format(name)) or 'return {}', ('@@ai-core/shared/%s.lua'):format(name))
    if not chunk then error(err) end
    data = chunk() or {}
    sharedFiles[name] = data
    return data
end
