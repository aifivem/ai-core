---Shows a notification card on one player's screen (ai-core draws it); `text` is already translated.
---@param src integer
---@param text string
---@param kind? 'info'|'success'|'warning'|'error'
---@param duration? integer ms
return function(src, text, kind, duration)
    TriggerClientEvent('ai-core:client:notify', src, { text = text, kind = kind or 'info', duration = duration })
end
