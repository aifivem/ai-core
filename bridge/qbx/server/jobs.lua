-- qbx_core's job membership exports: a loaded character changes through ai-core's player, a stored one (citizenid)
-- through ai-core's offline character exports.

local core = Bridge.core
local provide, qboxJobs, resolve, resolveSource = BridgeQbox.provide, BridgeQbox.qboxJobs, BridgeQbox.resolve, BridgeQbox.resolveSource
local getOfflinePlayer, playerNotFound, groupNotFound, jobMap = BridgeQbox.getOfflinePlayer, BridgeQbox.playerNotFound, BridgeQbox.groupNotFound, BridgeQbox.jobMap

--- A citizenid's loaded source, else its stored character's offline Player (waits); both nil when neither exists.
---@param citizenid string|integer
---@return integer|nil source, table|nil offline
local function member(citizenid)
    local key = tostring(citizenid)
    local source = Bridge.sourceByCitizenId(key)
    if source then return source, nil end
    local player = getOfflinePlayer(key)
    if player and not player.Offline then return player.PlayerData.source, nil end
    return nil, player
end

---@param offline table an offline Player
---@return integer
local function charIdOf(offline)
    return Bridge.charIdOf(offline.PlayerData.citizenid) --[[@as integer]]
end

--- An offline export's answer in Qbox's shape.
---@param result any
---@param code string
---@return boolean, QboxErrorResult?
local function offlineAnswer(result, code)
    if type(result) == 'table' and result.ok then return true end
    return false, { code = code, message = ('ai-core refused the change: %s'):format(type(result) == 'table' and tostring(result.error) or 'no answer') }
end

---@param citizenid string|integer
---@param jobName string
---@param grade? integer
---@return boolean, QboxErrorResult?
local function addPlayerToJob(citizenid, jobName, grade)
    jobName = tostring(jobName):lower()
    grade = math.tointeger(tonumber(grade)) or 0
    if jobName == 'unemployed' then return false, { code = 'unemployed', message = 'players cannot be added to the unemployed job' } end
    local job = qboxJobs()[jobName]
    if not job then return groupNotFound('job_not_found', jobName) end
    if not job.grades[grade] then return false, { code = 'job_missing_grade', message = ('job %s does not have grade %s'):format(jobName, grade) } end
    local source, offline = member(citizenid)
    if offline then
        if offline.PlayerData.jobs[jobName] == grade then return true end
        return offlineAnswer(Bridge.await('SetOfflineJob', charIdOf(offline), jobName, grade), 'max_jobs')
    end
    if not source then return playerNotFound(tostring(citizenid)) end
    if jobMap(Bridge.players[source])[jobName] == grade then return true end
    if not core:SetJob(source, jobName, grade) then return false, { code = 'max_jobs', message = 'ai-core refused the job (maximum jobs reached)' } end
    return true
end

---@param citizenid string|integer
---@param jobName string
---@return boolean, QboxErrorResult?
local function removePlayerFromJob(citizenid, jobName)
    if jobName == 'unemployed' then return false, { code = 'unemployed', message = 'players cannot be removed from the unemployed job' } end
    local source, offline = member(citizenid)
    if offline then
        if offline.PlayerData.jobs[jobName] == nil then return true end
        return offlineAnswer(Bridge.await('RemoveOfflineJob', charIdOf(offline), jobName), 'job_not_removed')
    end
    if not source then return playerNotFound(tostring(citizenid)) end
    if jobMap(Bridge.players[source])[jobName] == nil then return true end
    return core:RemoveJob(source, jobName) == true
end

--- The primary job is ai-core's current job: the on-duty one, so making a job primary puts the player on its duty. A
--- stored character's becomes its last duty job (its current job when it loads).
---@param citizenid string|integer
---@param jobName string
---@return boolean, QboxErrorResult?
local function setPrimaryJob(citizenid, jobName)
    local source, offline = member(citizenid)
    if not source and not offline then return playerNotFound(tostring(citizenid)) end
    local held = offline and offline.PlayerData.jobs or jobMap(Bridge.players[source --[[@as integer]]])
    if jobName ~= 'unemployed' and held[jobName] == nil then
        return false, { code = 'player_not_in_job', message = ('player %s does not have job %s'):format(tostring(citizenid), tostring(jobName)) }
    end
    if jobName ~= 'unemployed' and not qboxJobs()[jobName] then return groupNotFound('job_not_found', jobName) end
    if offline then
        return offlineAnswer(Bridge.await('SetOfflineMeta', charIdOf(offline), 'lastDutyJob', jobName ~= 'unemployed' and jobName or nil), 'job_not_set')
    end
    ---@cast source integer
    return core:SetDuty(source, jobName ~= 'unemployed' and jobName or nil) == true
end

provide('AddPlayerToJob', addPlayerToJob)
provide('RemovePlayerFromJob', removePlayerFromJob)
provide('SetPlayerPrimaryJob', setPrimaryJob)
provide('SetJob', function(identifier, jobName, grade)
    local source, offline = resolve(identifier)
    if (not source and not offline) or type(jobName) ~= 'string' then return false end
    jobName = jobName:lower()
    local data = offline and offline.PlayerData or BridgeQB.getPlayer(source --[[@as integer]]).PlayerData
    if jobName == 'unemployed' then
        local current = data.job.name
        if current == 'unemployed' then return true end
        return removePlayerFromJob(data.citizenid, current)
    end
    local ok, err = addPlayerToJob(data.citizenid, jobName, grade)
    if not ok then return false, err end
    return true
end)
--- Duty is runtime state of a loaded character.
provide('SetJobDuty', function(identifier, onDuty)
    local source = resolveSource(identifier)
    if not source then return end
    local job = Bridge.jobOf(Bridge.players[source])
    core:SetDuty(source, onDuty and job.name or nil)
end)

BridgeQbox.member = member
BridgeQbox.charIdOf = charIdOf
BridgeQbox.offlineAnswer = offlineAnswer
