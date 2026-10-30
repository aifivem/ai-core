---Hides the calling resource's prompt `id`.
---@param id string
return function(id)
    exports['ai-core']:HidePrompt(id)
end
