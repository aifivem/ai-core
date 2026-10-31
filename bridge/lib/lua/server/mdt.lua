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
    ---@return string?
    provider = function() return core:GetMdtSystem() end,
}
