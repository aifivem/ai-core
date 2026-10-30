---Text from another script made plain: HTML tags, GTA colour and input codes (`~r~`, `~INPUT_PICKUP~`) and `&nbsp;`
---removed, runs of spaces folded.
---@param text any
---@return string
return function(text)
    if text == nil then return '' end
    local out = tostring(text):gsub('<[^>]*>', ''):gsub('~[%w_]+~', ''):gsub('&nbsp;', ' '):gsub('%s%s+', ' ')
    return (out:gsub('^%s+', ''):gsub('%s+$', ''))
end
