-- Qbox on ai-core, both sides: the shapes Qbox hands out (job / gang definitions with grades keyed 0.., the group
-- filter, metadata defaults, notify arguments). Loaded after bridge/core/shared/shapes.lua, before the Qbox server and
-- client parts; creates the Qbox namespace `BridgeQbox`.

---@class QboxGrade
---@field name string
---@field payment? number jobs only
---@field isboss? boolean
---@field bankAuth? boolean

---@class QboxJob
---@field label string
---@field type? string
---@field defaultDuty? boolean
---@field offDutyPay? boolean
---@field grades table<integer, QboxGrade>

---@class QboxGang
---@field label string
---@field grades table<integer, QboxGrade>

---@class QboxErrorResult
---@field code string
---@field message string

---@class BridgeQbox
BridgeQbox = {}

--- The qbx_core release this bridge answers (`GetCoreVersion`).
BridgeQbox.VERSION = '1.24.1'

---@param grades AiGrade[]|nil
---@param job boolean
---@return table<integer, QboxGrade>
local function qboxGrades(grades, job)
    local out = {}
    for i, grade in ipairs(grades or {}) do
        local boss = grade.boss == true
        out[i - 1] = { name = grade.label, payment = job and (grade.salary or 0) or nil, isboss = boss, bankAuth = boss }
    end
    return out
end

--- An ai-core job definition in Qbox's shape (`shared/jobs.lua`).
---@param definition AiJobDefinition
---@return QboxJob
function BridgeQbox.job(definition)
    return {
        label = definition.label,
        type = definition.type,
        defaultDuty = definition.defaultDuty,
        offDutyPay = false,
        grades = qboxGrades(definition.grades, true),
    }
end

--- An ai-core gang definition in Qbox's shape (`shared/gangs.lua`).
---@param definition { label: string, grades: AiGrade[] }
---@return QboxGang
function BridgeQbox.gang(definition)
    return { label = definition.label, grades = qboxGrades(definition.grades, false) }
end

---@param definition any
---@return boolean
local function isDefinition(definition)
    return type(definition) == 'table' and type(definition.label) == 'string' and type(definition.grades) == 'table'
end

--- Every job of a definitions map in Qbox's shape (panel files carry a `$schema` key, skipped).
---@param definitions table<string, any>
---@return table<string, QboxJob>
function BridgeQbox.jobs(definitions)
    local out = {}
    for name, definition in pairs(definitions) do
        if isDefinition(definition) then out[name] = BridgeQbox.job(definition) end
    end
    return out
end

--- Every gang in Qbox's shape plus Qbox's `none` gang (ai-core keeps no definition for it).
---@param definitions table<string, any>
---@return table<string, QboxGang>
function BridgeQbox.gangs(definitions)
    local out = { none = { label = 'No Gang', grades = { [0] = { name = 'Unaffiliated', isboss = false, bankAuth = false } } } }
    for name, definition in pairs(definitions) do
        if isDefinition(definition) then out[name] = BridgeQbox.gang(definition) end
    end
    return out
end

--- Jobs and gangs of Qbox PlayerData merged by name (Qbox's GetPlayerGroups).
---@param data table PlayerData with `jobs` / `gangs`
---@return table<string, integer>
function BridgeQbox.groups(data)
    local out = {}
    for name, grade in pairs(data.jobs or {}) do out[name] = grade end
    for name, grade in pairs(data.gangs or {}) do
        if out[name] == nil then out[name] = grade end
    end
    return out
end

--- Qbox's group filter (HasPlayerGotGroup, from ox_target, MIT): a name, a list of names or `{ [name] = minGrade }`
--- against the primary job and gang, the citizenid and (unless `primary`) every job and gang held.
---@param filter string|string[]|table<string, integer>
---@param data table PlayerData with `job`, `gang`, `jobs`, `gangs`, `citizenid`
---@param primary? boolean only the primary job and gang
---@return boolean
function BridgeQbox.hasGroup(filter, data, primary)
    if not filter or type(data) ~= 'table' or not data.job or not data.gang then return false end
    local groups = not primary and BridgeQbox.groups(data) or nil
    ---@param name any
    ---@param grade? integer
    local function matches(name, grade)
        if data.citizenid == name then return true end
        if data.job.name == name and (not grade or grade <= data.job.grade.level) then return true end
        if data.gang.name == name and (not grade or grade <= data.gang.grade.level) then return true end
        local held = groups and groups[name]
        return held ~= nil and (not grade or grade <= held)
    end
    if type(filter) == 'string' then return matches(filter) end
    if type(filter) ~= 'table' then return false end
    if filter[1] ~= nil then
        for i = 1, #filter do
            if matches(filter[i]) then return true end
        end
        return false
    end
    for name, grade in pairs(filter) do
        if matches(name, tonumber(grade) or 0) then return true end
    end
    return false
end

--- Qbox's metadata defaults on top of QB's (CheckPlayerData), a fresh copy each call.
---@return table<string, any>
function BridgeQbox.metaDefaults()
    return {
        optin = false,
        health = 200,
        tracker = false,
        jailitems = {},
        status = {},
        phone = {},
        dealerrep = 0,
        craftingrep = 0,
        attachmentcraftingrep = 0,
        jobrep = { tow = 0, trucker = 0, taxi = 0, hotdog = 0 },
        rep = {},
        callsign = 'NO CALLSIGN',
        criminalrecord = { hasRecord = false },
        licences = { id = true, driver = true, weapon = false },
        inside = { apartment = {} },
        phonedata = { InstalledApps = {} },
    }
end

--- Fills the Qbox metadata keys a PlayerData lacks (ai-core's own values win).
---@param metadata table<string, any>
function BridgeQbox.fillMeta(metadata)
    for key, value in pairs(BridgeQbox.metaDefaults()) do
        if metadata[key] == nil then metadata[key] = value end
    end
end

--- Qbox notify arguments as a title and a text: `text` may be `{ text, caption }`, `subTitle` goes under the title.
---@param text string|{ text?: string, caption?: string }
---@param subTitle? string
---@return string|nil title, string|nil description
function BridgeQbox.notifyParts(text, subTitle)
    if type(text) == 'table' then
        if text.caption then return text.text, text.caption end
        return nil, text.text
    end
    if subTitle then return text, subTitle end
    return nil, text
end
