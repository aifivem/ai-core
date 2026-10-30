---Fills `{0}`, `{1}`... with the arguments (a missing one keeps its placeholder).
---@param text string
---@param ... string|number
---@return string
return function(text, ...)
    local args = { ... }
    return (text:gsub('{(%d+)}', function(index)
        local value = args[tonumber(index) + 1]
        return value ~= nil and tostring(value) or nil
    end))
end
