---Police MDT records through ai-core's MDT layer, like the TypeScript lib's `mdt`.
---@class AiLibMdtRecord
---@field kind 'fine'|'warrant'|'arrest'|'jail'
---@field target integer the player the record is about
---@field by? integer the officer
---@field title string what happened (translated)
---@field amount? integer a fine's dollars
---@field minutes? integer a jail sentence

local core = exports['ai-core']
return {
    ---Writes a record; false when no MDT runs or it takes no such record.
    ---@param record AiLibMdtRecord
    ---@return boolean
    record = function(record) return core:AddMdtRecord(record) end,
    ---Whether a character (a loaded player's server id or a citizenid) has an active warrant in the active MDT; false
    ---when not, no MDT runs or it exposes no warrants. Waits: call it from a thread.
    ---@param target integer|string
    ---@return boolean
    hasWarrant = function(target)
        local p = promise.new()
        local ok = pcall(core.HasMdtWarrant, core, target, function(wanted) p:resolve(wanted == true) end)
        if not ok then return false end
        return Citizen.Await(p)
    end,
    ---@return string?
    provider = function() return core:GetMdtSystem() end,
}
