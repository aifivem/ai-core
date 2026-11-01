-- ai-core's framework bridge, server side: job / gang definitions scripts create through a framework function (QB
-- AddJob, Qbox CreateJob, ESX CreateJob) are ai-core's runtime definitions. The bridge calls them from inside ai-core,
-- so ai-core owns them there; the bridge keeps the script that asked and removes them when that script stops.

local core = Bridge.core

---@class BridgeScriptGrade
---@field label string
---@field salary number
---@field boss boolean

---@class BridgeScriptDefinition
---@field label string
---@field type? string jobs only
---@field defaultDuty? boolean jobs only
---@field listed? boolean jobs only: shown in job centers
---@field grades table<integer, BridgeScriptGrade> by grade number from 0 (gaps allowed, filled when sent)

---@alias BridgeDefinitionKind 'job'|'gang'

--- Grades past this number are refused (a gap is filled with placeholder grades).
local MAX_GRADE = 99

---@type table<BridgeDefinitionKind, table<string, { owner: string, definition: BridgeScriptDefinition }>>
local scriptDefinitions = { job = {}, gang = {} }

--- A grade number of a framework table key or field (`0`, `'1'`); nil when it is none.
---@param value any
---@return integer|nil
function Bridge.gradeNumber(value)
    if type(value) == 'string' and value:match('^%d+$') then value = tonumber(value) end
    local grade = math.tointeger(value)
    return grade and grade >= 0 and grade <= MAX_GRADE and grade or nil
end

---@param definition BridgeScriptDefinition
---@param kind BridgeDefinitionKind
---@return table
local function aiDefinition(definition, kind)
    local top = -1
    for grade in pairs(definition.grades) do
        if grade > top then top = grade end
    end
    local grades = {}
    for grade = 0, top do
        local entry = definition.grades[grade]
        grades[grade + 1] = entry and { label = entry.label, salary = entry.salary, boss = entry.boss } or { label = ('Grade %d'):format(grade), salary = 0, boss = false }
    end
    local out = { label = definition.label, grades = grades }
    if kind == 'job' then
        out.type, out.defaultDuty, out.listed = definition.type or 'none', definition.defaultDuty == true, definition.listed == true
    end
    return out
end

--- The script definition the bridge registered under a name (with the resource that owns it), nil for panel jobs and
--- names nobody registered through the bridge.
---@param kind BridgeDefinitionKind
---@param name string
---@return { owner: string, definition: BridgeScriptDefinition }|nil
function Bridge.scriptDefinition(kind, name)
    return scriptDefinitions[kind][name]
end

--- Whether ai-core knows a job / gang of that name (panel, any script).
---@param kind BridgeDefinitionKind
---@param name string
---@return boolean
function Bridge.definitionExists(kind, name)
    return (kind == 'job' and Bridge.jobDefinitions() or Bridge.gangDefinitions())[name] ~= nil
end

--- Registers or replaces a script's job / gang as an ai-core runtime definition owned by `owner`. A panel name or one
--- another resource registered is refused (`CORE_ERR_DEFINITION_PANEL` / `CORE_ERR_DEFINITION_OWNER`).
---@param kind BridgeDefinitionKind
---@param name string
---@param definition BridgeScriptDefinition
---@param owner string
---@return boolean ok, string? error ai-core lang key
function Bridge.putDefinition(kind, name, definition, owner)
    local mine = scriptDefinitions[kind][name]
    if mine and mine.owner ~= owner then return false, 'CORE_ERR_DEFINITION_OWNER' end
    local result = kind == 'job' and core:RegisterJobDefinition(name, aiDefinition(definition, kind))
        or core:RegisterGangDefinition(name, aiDefinition(definition, kind))
    if type(result) ~= 'table' or not result.ok then return false, type(result) == 'table' and result.error or 'CORE_ERR_ARGS' end
    scriptDefinitions[kind][name] = { owner = owner, definition = definition }
    return true
end

--- Removes a job / gang `owner` registered through the bridge; false for any other name.
---@param kind BridgeDefinitionKind
---@param name string
---@param owner string
---@return boolean
function Bridge.dropDefinition(kind, name, owner)
    local mine = scriptDefinitions[kind][name]
    if not mine or mine.owner ~= owner then return false end
    scriptDefinitions[kind][name] = nil
    if kind == 'job' then core:RemoveJobDefinition(name) else core:RemoveGangDefinition(name) end
    return true
end

AddEventHandler('onResourceStop', function(resource)
    for kind, list in pairs(scriptDefinitions) do
        for name, entry in pairs(list) do
            if entry.owner == resource then Bridge.dropDefinition(kind --[[@as BridgeDefinitionKind]], name, resource) end
        end
    end
end)
