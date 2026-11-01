---ai-core's job / gang definitions (`{ label, grades = { { label, salary, boss } } }`, grade n at `grades[n + 1]`):
---each fetched once, forgotten when the panel or a script changes it, so a read is a table lookup.
local core = exports['ai-core']
local cache = { jobs = {}, gangs = {} }

AddEventHandler('ai-core:definitionsChanged', function(file, name)
    if cache[file] and type(name) == 'string' then cache[file][name] = nil end
end)

---@param file 'jobs'|'gangs'
---@param name string
---@param read fun(name: string): table?
local function get(file, name, read)
    local found = cache[file][name]
    if found == nil then
        found = read(name) or false
        cache[file][name] = found
    end
    return found or nil
end

return {
    ---@param name string
    ---@return table?
    job = function(name) return get('jobs', name, function(n) return core:GetJobDefinition(n) end) end,
    ---@param name string
    ---@return table?
    gang = function(name) return get('gangs', name, function(n) return core:GetGangDefinition(n) end) end,
    ---Registers a job of this resource (gone when it stops, never saved to the panel); `{ ok, error? }`.
    registerJob = function(name, definition) return core:RegisterJobDefinition(name, definition) end,
    ---@return boolean
    removeJob = function(name) return core:RemoveJobDefinition(name) end,
    registerGang = function(name, definition) return core:RegisterGangDefinition(name, definition) end,
    ---@return boolean
    removeGang = function(name) return core:RemoveGangDefinition(name) end,
}
