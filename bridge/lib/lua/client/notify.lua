---Shows a notification card (ai-lib draws it, `title` above the text); texts are already translated.
---@param text string
---@param kind? 'info'|'success'|'warning'|'error'
---@param duration? integer ms
---@param title? string
return function(text, kind, duration, title)
    exports['ai-lib']:Notify({ text = text, kind = kind or 'info', duration = duration, title = title })
end
