---Shows the calling resource's prompt `id` on the right of the screen (or changes its text).
---@param id string
---@param text string
return function(id, text)
    exports['ai-core']:ShowPrompt(id, text)
end
