---Shows a notification card on one player's screen (ai-lib draws it, `title` above the text); texts are already
---translated.
---@param src integer
---@param text string
---@param kind? 'info'|'success'|'warning'|'error'
---@param duration? integer ms
---@param title? string
return function(src, text, kind, duration, title)
    TriggerClientEvent('ai-lib:client:notify', src,
        { text = text, kind = kind or 'info', duration = duration, title = title })
end
