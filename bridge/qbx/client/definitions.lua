-- Qbox on ai-core, client side: `exports.qbx_core:*`, Qbox's PlayerData additions on the QB PlayerData
-- (bridge/qb/client/player.lua), qbx_core's client events fired locally from ai-core's player data channel, and the
-- client handlers modules/lib.lua relies on (vehicle properties, `initVehicle`). `QBX.PlayerData` for scripts that
-- include `@qbx_core/modules/playerdata.lua` is ai-core's modules/playerdata.lua.
-- This file: `BridgeQbox.provide` and the job / gang definitions in Qbox's shape.

---@param name string
---@param fn function
function BridgeQbox.provide(name, fn) BridgeClient.provideExport('qbx_core', name, fn) end
local provide = BridgeQbox.provide

-- Job / gang definitions in Qbox's shape, from ai-core's client definitions (dropped when the panel changes one).

---@type { jobs: table<string, QboxJob>|nil, gangs: table<string, QboxGang>|nil }
local definitions = {}

---@return table<string, QboxJob>
local function qboxJobs()
    definitions.jobs = definitions.jobs or BridgeQbox.jobs(exports['ai-core']:GetDefinitions('jobs') or {})
    return definitions.jobs
end

---@return table<string, QboxGang>
local function qboxGangs()
    definitions.gangs = definitions.gangs or BridgeQbox.gangs(exports['ai-core']:GetDefinitions('gangs') or {})
    return definitions.gangs
end

AddEventHandler('ai-core:client:definitions', function(file, name, value)
    local valid = type(value) == 'table' and type(value.grades) == 'table'
    if file == 'jobs' then
        definitions.jobs = nil
        TriggerEvent('qbx_core:client:onJobUpdate', name, valid and BridgeQbox.job(value) or nil)
    elseif file == 'gangs' then
        definitions.gangs = nil
        TriggerEvent('qbx_core:client:onGangUpdate', name, valid and BridgeQbox.gang(value) or nil)
    end
end)

provide('GetJobs', qboxJobs)
provide('GetGangs', qboxGangs)
provide('GetJob', function(name) return qboxJobs()[name] end)
provide('GetGang', function(name) return qboxGangs()[name] end)
