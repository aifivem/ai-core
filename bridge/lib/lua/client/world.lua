---The weather and time sync of whatever weather script runs, paused while a reason holds (an interior, a scene).
return {
    ---@param reason string
    pauseSync = function(reason) exports['ai-core']:PauseWorldSync(reason) end,
    ---@param reason string
    resumeSync = function(reason) exports['ai-core']:ResumeWorldSync(reason) end,
}
