---Police (and other job) alerts through ai-core's dispatch layer (whatever alert system runs: tgiann-policealert,
---ai-policealert's alert cards...). Texts are already translated.
---@class AiLibDispatchAlert
---@field title string the headline ("Shots fired")
---@field code? string radio code before the title ("10-71")
---@field message? string one more line (the shop's name)
---@field coords? { x: number, y: number, z: number } without it the `source` player's position
---@field jobs? string[] jobs whose on-duty members get it (default: the alert system's police jobs)
---@field source? integer the player the alert is about (systems describe the suspect from this player)
---@field blip? { sprite: integer, color?: integer, scale?: number }
---@field duration? integer seconds the alert stays
---@field icon? string Font Awesome solid icon name without `fa-`
---@field priority? 'normal'|'high'

local core = exports['ai-core']
return {
    ---Sends an alert; false when no alert system runs or the alert is invalid.
    ---@param alert AiLibDispatchAlert
    ---@return boolean
    alert = function(alert) return core:SendDispatchAlert(alert) end,
}
