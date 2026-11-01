-- QB's Shared job and gang registries: jobs and gangs scripts add become ai-core runtime definitions owned by that
-- script (gone when it stops; ai-core's definitionsChanged sends QB's Shared update).

--- A QB / Qbox job or gang table (`label`, `type`, `defaultDuty`, grades keyed `'0'` / `0` with `name`, `payment`,
--- `isboss`) as the bridge's script definition; nil when it is not one.
---@param kind BridgeDefinitionKind
---@param name string
---@param value any
---@return BridgeScriptDefinition|nil
local function scriptDefinition(kind, name, value)
    if type(value) ~= 'table' then return nil end
    local grades = {}
    for key, grade in pairs(type(value.grades) == 'table' and value.grades or {}) do
        local number = Bridge.gradeNumber(key)
        if not number or type(grade) ~= 'table' then return nil end
        local label = grade.name or grade.label
        grades[number] = { label = type(label) == 'string' and label or ('Grade %d'):format(number), salary = math.max(0, math.floor(tonumber(grade.payment) or 0)), boss = grade.isboss == true }
    end
    local definition = { label = type(value.label) == 'string' and value.label or name, grades = grades }
    if kind == 'job' then
        definition.type = type(value.type) == 'string' and value.type or 'none'
        definition.defaultDuty = value.defaultDuty == true
    end
    return definition
end
BridgeQB.scriptDefinition = scriptDefinition

---@param kind BridgeDefinitionKind
local function definitionRegistry(kind)
    local invalid, exists, missing = ('invalid_%s_name'):format(kind), ('%s_exists'):format(kind), ('%s_not_exists'):format(kind)
    local managed, foreign = ('%s_managed_by_ai_core'):format(kind), ('%s_owned_by_another_resource'):format(kind)
    ---@return string|nil error
    local function put(name, value, owner)
        local definition = scriptDefinition(kind, name, value)
        if not definition then return invalid end
        local ok, err = Bridge.putDefinition(kind, name, definition, owner)
        if ok then return nil end
        return err == 'CORE_ERR_DEFINITION_OWNER' and foreign or err == 'CORE_ERR_DEFINITION_PANEL' and exists or invalid
    end
    local function add(name, value)
        if type(name) ~= 'string' then return false, invalid end
        if Bridge.definitionExists(kind, name) then return false, exists end
        local err = put(name, value, GetInvokingResource() or 'ai-core')
        if err then return false, err end
        return true, 'success'
    end
    local function addMany(values)
        if type(values) ~= 'table' then return false, invalid end
        for name, value in pairs(values) do
            if type(name) ~= 'string' or not scriptDefinition(kind, name, value) then return false, invalid, value end
            if Bridge.definitionExists(kind, name) then return false, exists, value end
        end
        local owner = GetInvokingResource() or 'ai-core'
        for name, value in pairs(values) do
            local err = put(name, value, owner)
            if err then return false, err, value end
        end
        return true, 'success', nil
    end
    -- ai-core's panel jobs and gangs are changed in the panel; a script changes only its own.
    local function update(name, value)
        if type(name) ~= 'string' then return false, invalid end
        if not Bridge.scriptDefinition(kind, name) then return false, Bridge.definitionExists(kind, name) and managed or missing end
        local err = put(name, value, GetInvokingResource() or 'ai-core')
        if err then return false, err end
        return true, 'success'
    end
    local function remove(name)
        if type(name) ~= 'string' then return false, invalid end
        if not Bridge.scriptDefinition(kind, name) then return false, Bridge.definitionExists(kind, name) and managed or missing end
        if not Bridge.dropDefinition(kind, name, GetInvokingResource() or 'ai-core') then return false, foreign end
        return true, 'success'
    end
    return add, addMany, update, remove
end

QBCore.Functions.AddJob, QBCore.Functions.AddJobs, QBCore.Functions.UpdateJob, QBCore.Functions.RemoveJob = definitionRegistry('job')
QBCore.Functions.AddGang, QBCore.Functions.AddGangs, QBCore.Functions.UpdateGang, QBCore.Functions.RemoveGang = definitionRegistry('gang')
