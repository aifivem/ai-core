-- ai-core's framework bridge, server side: framework values read as ai-core's (a command's words, a citizenid's
-- character id, birth dates, sex).

--- The words after the command name of a typed command line (the frameworks hand commands their raw arguments).
---@param raw string
---@return string[]
function Bridge.words(raw)
    local out = {}
    for word in tostring(raw or ''):gmatch('%S+') do out[#out + 1] = word end
    table.remove(out, 1)
    return out
end

--- ai-core's character id behind a citizenid (ai-core's citizenid is the character id as text); nil when it cannot be one.
---@param citizenid any
---@return integer|nil
function Bridge.charIdOf(citizenid)
    if type(citizenid) ~= 'string' and type(citizenid) ~= 'number' then return nil end
    local id = math.tointeger(tonumber(citizenid))
    return id and id > 0 and tostring(id) == tostring(citizenid) and id or nil
end

--- A birth date as ai-core's `YYYY-MM-DD`: ISO dates stay, `DD/MM/YYYY` (esx_identity's default; `MM/DD/YYYY` when the
--- first part cannot be a month) is turned around. Nil when it is no date.
---@param text any
---@return string|nil
function Bridge.isoDate(text)
    if type(text) ~= 'string' then return nil end
    local year, month, day = text:match('^(%d%d%d%d)[%-/%.](%d%d?)[%-/%.](%d%d?)$')
    if not year then
        local a, b
        a, b, year = text:match('^(%d%d?)[%-/%.](%d%d?)[%-/%.](%d%d%d%d)$')
        if not a then return nil end
        day, month = a, b
        if tonumber(month) > 12 and tonumber(day) <= 12 then day, month = month, day end
    end
    return ('%s-%02d-%02d'):format(year, tonumber(month), tonumber(day))
end

--- ai-core's sex from a framework value: QB gender 1 / '1' / 'Female', ESX 'f' are female, anything else male.
---@param value any
---@return 'male'|'female'
function Bridge.sexOf(value)
    if value == 1 or value == '1' then return 'female' end
    local text = type(value) == 'string' and value:lower() or ''
    return (text == 'f' or text == 'female') and 'female' or 'male'
end
