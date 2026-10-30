-- Loaded players through ai-core's exports (character, jobs, duty). For lookups at an action, not for every tick.
local core = exports['ai-core']
return {
    ---@param src integer
    ---@return table? character { id, citizenid, firstname, lastname, birthdate, sex, nationality }
    character = function(src) return core:GetCharacter(src) end,
    ---@param src integer
    ---@return table[] jobs { job, grade, ... }
    jobs = function(src) return core:GetJobs(src) or {} end,
    ---@param src integer
    ---@return table[] gangs { gang, grade }
    gangs = function(src) return core:GetGangs(src) or {} end,
    ---The player's grade in a job, or nil when not a member.
    ---@param src integer
    ---@param job string
    ---@return integer?
    jobGrade = function(src, job)
        for _, m in ipairs(core:GetJobs(src) or {}) do
            if m.job == job then return m.grade end
        end
    end,
    ---The player's grade in a gang, or nil when not a member.
    ---@param src integer
    ---@param gang string
    ---@return integer?
    gangGrade = function(src, gang)
        for _, m in ipairs(core:GetGangs(src) or {}) do
            if m.gang == gang then return m.grade end
        end
    end,
    ---@param src integer
    ---@return string?
    dutyJob = function(src) return core:GetDutyJob(src) end,
    ---Server ids of every player with a loaded character.
    ---@return integer[]
    sources = function() return core:GetLoadedSources() or {} end,
}
