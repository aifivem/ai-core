-- ESX on ai-core, server side: ESX's Discord logs through ai-core's logs.

--- ESX's Discord log, through ai-core's logs (the panel picks Discord, Fivemanage, console...). Channel = `name`.
---@param name string
---@param title string
---@param color string
---@param message string
function ESX.DiscordLog(name, title, color, message)
    aiLib.aiLog(tostring(name or 'default'), ('%s: %s'):format(tostring(title), tostring(message)), { metadata = { color = color } })
end

---@param name string
---@param title string
---@param color string
---@param fields { name: string, value: any, inline?: boolean }[]
function ESX.DiscordLogFields(name, title, color, fields)
    local metadata = { color = color }
    for _, field in ipairs(type(fields) == 'table' and fields or {}) do metadata[tostring(field.name)] = tostring(field.value) end
    aiLib.aiLog(tostring(name or 'default'), tostring(title), { metadata = metadata })
end
