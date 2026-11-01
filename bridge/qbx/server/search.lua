-- qbx_core's SearchPlayers and duty counts.

local provide = BridgeQbox.provide

---@param value any
---@param wanted any
---@param strict boolean
---@return boolean
local function metaMatches(value, wanted, strict)
    if type(wanted) == 'number' then
        value = tonumber(value)
        return value ~= nil and (strict and value == wanted or not strict and value >= wanted)
    end
    return value == wanted
end

--- Qbox's SearchPlayers filters (license, job, gang, charinfo, metadata) over the loaded characters.
provide('SearchPlayers', function(filters)
    filters = type(filters) == 'table' and filters or {}
    local out = {}
    for source in pairs(Bridge.players) do
        local player = BridgeQB.getPlayer(source)
        local data = player and player.PlayerData
        local ok = data ~= nil
        if ok and filters.license and data.license ~= filters.license then ok = false end
        if ok and filters.job and data.job.name ~= filters.job then ok = false end
        if ok and filters.gang and data.gang.name ~= filters.gang then ok = false end
        if ok and type(filters.charinfo) == 'table' then
            for key, value in pairs(filters.charinfo) do
                if data.charinfo[key] ~= value then ok = false break end
            end
        end
        if ok and type(filters.metadata) == 'table' then
            local strict = filters.metadata.strict == true
            for key, value in pairs(filters.metadata) do
                if key ~= 'strict' and not metaMatches(data.metadata[key], value, strict) then ok = false break end
            end
        end
        if ok then out[#out + 1] = player end
    end
    return out
end)

--- On-duty count of a job and the on-duty sources (Qbox's GetDutyCountJob).
---@param job string
---@return integer, integer[]
local function dutyCount(job)
    local sources = {}
    for source in pairs(Bridge.onDutyIn(job)) do sources[#sources + 1] = source end
    return #sources, sources
end

provide('GetDutyCountJob', dutyCount)
provide('GetDutyCountType', function(jobType)
    local sources = {}
    for job, definition in pairs(Bridge.jobDefinitions()) do
        if definition.type == jobType then
            for source in pairs(Bridge.onDutyIn(job)) do sources[#sources + 1] = source end
        end
    end
    return #sources, sources
end)
