-- qbx_core's group definition exports: the jobs and gangs, and the definitions scripts create (qbx_core's groups
-- API) as ai-core runtime definitions owned by the calling script (gone when it stops; ai-core's definitionsChanged
-- fires Qbox's onJobUpdate / onGangUpdate). ai-core's panel jobs and gangs, and those another script made, are not
-- changed from here.

local provide, qboxJobs, qboxGangs = BridgeQbox.provide, BridgeQbox.qboxJobs, BridgeQbox.qboxGangs

provide('GetJobs', qboxJobs)
provide('GetGangs', qboxGangs)
provide('GetJob', function(name) return qboxJobs()[name] end)
provide('GetGang', function(name) return qboxGangs()[name] end)
provide('IsGradeBoss', function(group, grade)
    local definition = qboxJobs()[group] or qboxGangs()[group]
    if not definition then return nil end
    local entry = definition.grades[math.tointeger(tonumber(grade)) or -1]
    return entry ~= nil and entry.isboss == true
end)

---@return string
local function invoker() return GetInvokingResource() or 'ai-core' end

---@param kind BridgeDefinitionKind
---@return string
local function title(kind) return kind == 'job' and 'Job' or 'Gang' end

---@param kind BridgeDefinitionKind
---@param name any
---@param value any a Qbox job / gang table
---@param owner string
---@return boolean, string
local function createGroup(kind, name, value, owner)
    if type(name) ~= 'string' or name:match('^%s*$') then return false, ('Invalid parameter: %sName must be a non-empty string.'):format(kind) end
    local definition = BridgeQB.scriptDefinition(kind, name, value)
    if not definition then return false, ("Invalid %s '%s': a table with grades keyed by integers 0-99."):format(kind, name) end
    local ok, err = Bridge.putDefinition(kind, name, definition, owner)
    if not ok then return false, ("%s '%s' refused by ai-core: %s"):format(title(kind), name, tostring(err)) end
    return true, ("%s '%s' created/updated successfully."):format(title(kind), name)
end

---@param kind BridgeDefinitionKind
---@param name any
---@param owner string
---@return boolean, string
local function removeGroup(kind, name, owner)
    if type(name) ~= 'string' then return false, ('invalid_%s_name'):format(kind) end
    if not Bridge.scriptDefinition(kind, name) then return false, ('%s_not_exists'):format(kind) end
    if not Bridge.dropDefinition(kind, name, owner) then return false, ('%s_owned_by_another_resource'):format(kind) end
    return true, 'success'
end

---@param definition BridgeScriptDefinition
---@return BridgeScriptDefinition
local function copyDefinition(definition)
    local out = {}
    for key, value in pairs(definition) do out[key] = value end
    out.grades = {}
    for grade, entry in pairs(definition.grades) do out.grades[grade] = entry end
    return out
end

--- Qbox's in-place edits (UpsertJobData, UpsertJobGrade, RemoveJobGrade...) on a script's own definition; refusals are
--- printed as Qbox prints its errors.
---@param kind BridgeDefinitionKind
---@param export string
---@param name any
---@param create boolean a missing name is created (the Upsert*Data exports)
---@param change fun(definition: BridgeScriptDefinition): string? an error text refuses the edit
local function editGroup(kind, export, name, create, change)
    local function refuse(why) print(('^3[ai-core bridge] exports.qbx_core:%s(%s): %s^0'):format(export, tostring(name), why)) end
    if type(name) ~= 'string' then return refuse(('invalid %s name'):format(kind)) end
    local mine = Bridge.scriptDefinition(kind, name)
    local definition
    if mine then
        definition = copyDefinition(mine.definition)
    elseif Bridge.definitionExists(kind, name) then
        return refuse(('%s %s belongs to ai-core\'s admin panel or another script'):format(kind, name))
    elseif create then
        definition = { label = name, grades = {} }
    else
        return refuse(('%s must exist to edit grades'):format(title(kind)))
    end
    local err = change(definition)
    if err then return refuse(err) end
    local ok, why = Bridge.putDefinition(kind, name, definition, invoker())
    if not ok then refuse(tostring(why)) end
end

---@param data any
---@param job boolean
---@return BridgeScriptGrade|nil
local function gradeOf(data, job)
    if type(data) ~= 'table' then return nil end
    local label = data.name or data.label
    return {
        label = type(label) == 'string' and label or 'Member',
        salary = job and math.max(0, math.floor(tonumber(data.payment) or 0)) or 0,
        boss = data.isboss == true,
    }
end

provide('CreateJob', function(name, job) return createGroup('job', name, job, invoker()) end)
provide('CreateJobs', function(newJobs)
    if type(newJobs) ~= 'table' then return false, 'Invalid parameter: newJobs must be a table.' end
    local owner, failed = invoker(), {}
    for name, job in pairs(newJobs) do
        local ok, message = createGroup('job', name, job, owner)
        if not ok then failed[#failed + 1] = ('%s (%s)'):format(tostring(name), message) end
    end
    if #failed > 0 then return false, ('Some jobs failed to create: %s'):format(table.concat(failed, ', ')) end
    return true, 'All jobs created/updated successfully.'
end)
provide('CreateGangs', function(newGangs)
    if type(newGangs) ~= 'table' then return false, 'Invalid parameter: newGangs must be a table.' end
    for name, gang in pairs(newGangs) do
        if type(name) ~= 'string' or not BridgeQB.scriptDefinition('gang', name, gang) then
            return false, ("Invalid parameter: gang '%s' must be a table with grades keyed by integers 0-99."):format(tostring(name))
        end
    end
    local owner = invoker()
    for name, gang in pairs(newGangs) do
        local ok, message = createGroup('gang', name, gang, owner)
        if not ok then return false, message end
    end
    return true
end)
provide('RemoveJob', function(name) return removeGroup('job', name, invoker()) end)
provide('RemoveGang', function(name) return removeGroup('gang', name, invoker()) end)

provide('UpsertJobData', function(name, data)
    editGroup('job', 'UpsertJobData', name, true, function(definition)
        if type(data) ~= 'table' then return 'data must be a table' end
        definition.label = type(data.label) == 'string' and data.label or definition.label
        definition.type = type(data.type) == 'string' and data.type or 'none'
        definition.defaultDuty = data.defaultDuty == true
    end)
end)
provide('UpsertGangData', function(name, data)
    editGroup('gang', 'UpsertGangData', name, true, function(definition)
        if type(data) ~= 'table' then return 'data must be a table' end
        definition.label = type(data.label) == 'string' and data.label or definition.label
    end)
end)
for _, entry in ipairs({ { 'UpsertJobGrade', 'job' }, { 'UpsertGangGrade', 'gang' } }) do
    local export, kind = entry[1], entry[2] --[[@as BridgeDefinitionKind]]
    provide(export, function(name, grade, data)
        editGroup(kind, export, name, false, function(definition)
            local number, value = Bridge.gradeNumber(grade), gradeOf(data, kind == 'job')
            if not number then return 'grade must be an integer from 0 to 99' end
            if not value then return 'grade data must be a table' end
            definition.grades[number] = value
        end)
    end)
end
for _, entry in ipairs({ { 'RemoveJobGrade', 'job' }, { 'RemoveGangGrade', 'gang' } }) do
    local export, kind = entry[1], entry[2] --[[@as BridgeDefinitionKind]]
    provide(export, function(name, grade)
        editGroup(kind, export, name, false, function(definition)
            local number = Bridge.gradeNumber(grade)
            if not number then return 'grade must be an integer from 0 to 99' end
            definition.grades[number] = nil
        end)
    end)
end
