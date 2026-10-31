---Shows a notification card (ai-core draws it); `text` is already translated.
---@param text string
---@param kind? 'info'|'success'|'warning'|'error'
---@param duration? integer ms
return function(text, kind, duration)
    exports['ai-lib']:Notify({ text = text, kind = kind or 'info', duration = duration })
end
