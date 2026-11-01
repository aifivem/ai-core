-- Loaded players through ai-core's exports (character, jobs, duty). For lookups at an action, not for every tick.
-- Job counts and job members come from this resource's mirror (like the TypeScript lib's `online`): read from ai-core
-- once on first use, then kept by its local events, so counting police on every robbery costs no export call.
local core = exports['ai-core']

local players = {} -- source -> { citizenid, jobs = membership[], names = { [job] = true }, duty }
local members = {} -- job -> { [source] = true }
local memberCount = {} -- job -> integer
local onDuty = {} -- job -> { [source] = true }
local dutyCount = {} -- job -> integer
local multi = {} -- source -> true for players with more than one job (the only ones a job count can count twice)
local listeners = {}
local started = false
local loading = false

local function put(index, counts, job, src)
    local set = index[job]
    if not set then set = {}; index[job] = set end
    if set[src] then return end
    set[src] = true
    counts[job] = (counts[job] or 0) + 1
end

local function take(index, counts, job, src)
    local set = index[job]
    if not set or not set[src] then return end
    set[src] = nil
    counts[job] = counts[job] - 1
    if counts[job] == 0 then index[job], counts[job] = nil, nil end
end

local function emit(src, player, jobs, duty, online)
    if #listeners == 0 then return end
    local change = {
        source = src,
        citizenid = player.citizenid,
        jobs = online and player.jobs or {},
        duty = online and player.duty or nil,
        online = online,
        previous = { jobs = jobs, duty = duty },
    }
    for i = 1, #listeners do listeners[i](change) end
end

local function setJobs(src, jobs)
    local player = players[src]
    if not player then return end
    local before = player.jobs
    for job in pairs(player.names) do take(members, memberCount, job, src) end
    player.names = {}
    for _, m in ipairs(jobs) do
        player.names[m.job] = true
        put(members, memberCount, m.job, src)
    end
    player.jobs = jobs
    multi[src] = #jobs > 1 or nil
    if not loading then emit(src, player, before, player.duty, true) end
end

local function setDuty(src, job)
    local player = players[src]
    if not player or player.duty == job then return end
    local before = player.duty
    if before then take(onDuty, dutyCount, before, src) end
    player.duty = job
    if job then put(onDuty, dutyCount, job, src) end
    if not loading then emit(src, player, player.jobs, before, true) end
end

local function drop(src)
    local player = players[src]
    if not player then return end
    local jobs, duty = player.jobs, player.duty
    loading = true
    setDuty(src, nil)
    setJobs(src, {})
    loading = false
    players[src] = nil
    emit(src, player, jobs, duty, false)
end

local function load(src, character)
    drop(src)
    players[src] = { citizenid = tostring(character.citizenid), jobs = {}, names = {}, duty = nil }
    loading = true
    setJobs(src, core:GetJobs(src) or {})
    setDuty(src, core:GetDutyJob(src))
    loading = false
    emit(src, players[src], {}, nil, true)
end

local function start()
    if started then return end
    started = true
    AddEventHandler('ai-core:playerLoaded', load)
    AddEventHandler('ai-core:playerUnloaded', drop)
    AddEventHandler('ai-core:jobsChanged', setJobs)
    AddEventHandler('ai-core:dutyChanged', setDuty)
    for _, src in ipairs(core:GetLoadedSources() or {}) do
        local character = core:GetCharacter(src)
        if character then load(src, character) end
    end
end

---@param jobs string|string[]
local function list(jobs)
    return type(jobs) == 'table' and jobs or { jobs }
end

return {
    ---How many players hold one of the jobs (a player in several counts once), or with `onlyOnDuty` are on duty in one.
    ---@param jobs string|string[]
    ---@param onlyOnDuty? boolean
    ---@return integer
    jobCount = function(jobs, onlyOnDuty)
        start()
        jobs = list(jobs)
        local count = 0
        if onlyOnDuty then
            for i = 1, #jobs do count = count + (dutyCount[jobs[i]] or 0) end
            return count
        end
        for i = 1, #jobs do count = count + (memberCount[jobs[i]] or 0) end
        if #jobs == 1 then return count end
        -- a player in several of the jobs was counted once per job
        for src in pairs(multi) do
            local held = 0
            for i = 1, #jobs do
                if members[jobs[i]] and members[jobs[i]][src] then held = held + 1 end
            end
            if held > 1 then count = count - (held - 1) end
        end
        return count
    end,
    ---Server ids of the players holding one of the jobs (or with `onlyOnDuty` on duty in one), each once.
    ---@param jobs string|string[]
    ---@param onlyOnDuty? boolean
    ---@return integer[]
    jobPlayers = function(jobs, onlyOnDuty)
        start()
        local index = onlyOnDuty and onDuty or members
        local out, seen = {}, {}
        for _, job in ipairs(list(jobs)) do
            for src in pairs(index[job] or {}) do
                if not seen[src] then
                    seen[src] = true
                    out[#out + 1] = src
                end
            end
        end
        return out
    end,
    ---Calls `cb(change)` when a loaded player's jobs or duty change, once at each load (`previous` empty) and at each
    ---unload (`online` false): `{ source, citizenid, jobs = { job, grade }[], duty?, online, previous = { jobs, duty? } }`.
    ---The players already loaded when it subscribes are not replayed (read `sources()`).
    ---@param cb fun(change: table)
    onJobState = function(cb)
        start()
        listeners[#listeners + 1] = cb
    end,
    ---@param src integer
    ---@return table? character { id, citizenid, firstname, lastname, birthdate, sex, nationality }
    character = function(src) return core:GetCharacter(src) end,
    ---The character's "Firstname Lastname", else the FiveM player name ('' with `fallback = false`).
    ---@param src integer
    ---@param fallback? boolean
    ---@return string
    name = function(src, fallback)
        local c = core:GetCharacter(src)
        if c then return ('%s %s'):format(c.firstname, c.lastname) end
        return fallback == false and '' or (GetPlayerName(src) or '')
    end,
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
    ---The server id of a loaded character by its citizenid, or nil.
    ---@param citizenid string
    ---@return integer?
    sourceOf = function(citizenid) return core:GetSourceByCitizenId(tostring(citizenid)) end,
    ---Every loaded character by server id.
    ---@return table<integer, table>
    characters = function()
        local out = {}
        for _, src in ipairs(core:GetLoadedSources() or {}) do out[src] = core:GetCharacter(src) end
        return out
    end,
    ---Server ids of every player with a loaded character.
    ---@return integer[]
    sources = function() return core:GetLoadedSources() or {} end,
}
