---Jobs and gangs of a loaded player through ai-core, like the TypeScript lib's `jobs` (several per character, one on
---duty, one active gang). Reads across many players are `aiLib.online`.
local core = exports['ai-core']
return {
    ---The job other scripts see: on duty, else last on duty, else the first, else unemployed (`{ job, grade }`).
    ---@param src integer
    ---@return { job: string, grade: integer }?
    current = function(src) return core:GetCurrentJob(src) end,
    ---@return { job: string, grade: integer }[]
    list = function(src) return core:GetJobs(src) or {} end,
    ---The job the player is on duty in, or nil.
    ---@return string?
    duty = function(src) return core:GetDutyJob(src) end,
    ---On duty in `job` (one of theirs), or off duty with nil.
    ---@param job string?
    ---@return boolean
    setDuty = function(src, job) return core:SetDuty(src, job) end,
    ---Adds or regrades a job under the panel's job rules.
    ---@return boolean
    set = function(src, job, grade) return core:SetJob(src, job, grade) end,
    ---@return boolean
    remove = function(src, job) return core:RemoveJob(src, job) end,
    ---@param job string
    ---@return integer
    onDutyCount = function(job) return core:GetOnDutyCount(job) end,
    ---@return { gang: string, grade: integer }[]
    gangs = function(src) return core:GetGangs(src) or {} end,
    ---@return string?
    activeGang = function(src) return core:GetActiveGang(src) end,
    ---@param gang string?
    ---@return boolean
    setActiveGang = function(src, gang) return core:SetActiveGang(src, gang) end,
    ---@return boolean
    setGang = function(src, gang, grade) return core:SetGang(src, gang, grade) end,
    ---@return boolean
    removeGang = function(src, gang) return core:RemoveGang(src, gang) end,
}
