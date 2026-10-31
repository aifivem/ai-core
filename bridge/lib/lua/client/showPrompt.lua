---Shows the calling resource's prompt `id` on the right of the screen (or changes its text).
---@param id string
---@param text string
return function(id, text)
    exports['ai-lib']:ShowPrompt(id, text)
end
