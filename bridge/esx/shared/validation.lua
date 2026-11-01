-- ESX on ai-core, both sides: es_extended's checks (ESX.ValidateType, AssertType, IsFunctionReference,
-- IsValidLocaleString), copied from es_extended 1.12.4 / 1.16.3 (GPL-3.0).

---@param value any
---@param ... string
---@return boolean, string?
function ESX.ValidateType(value, ...)
    local types = { ... }
    if #types == 0 then return true end
    for i = 1, #types do
        if type(value) == types[i] then return true end
    end
    return false, ('bad value (%s expected, got %s)'):format(table.concat(types, ' or '), type(value))
end

---@param ... any
---@return boolean
function ESX.AssertType(...)
    local ok, message = ESX.ValidateType(...)
    assert(ok, message)
    return ok
end

---@param value any
---@return boolean
function ESX.IsFunctionReference(value)
    if type(value) == 'function' then return true end
    local meta = type(value) == 'table' and getmetatable(value)
    return meta and type(meta.__call) == 'function' or false
end

-- Names (es_extended shared/modules/validation.lua) -----------------------------------------------------------------

---@type integer[][]
local defaultRanges = { { 0x0041, 0x005A }, { 0x0061, 0x007A }, { 0x0020, 0x0020 }, { 0x002D, 0x002D }, { 0x00C0, 0x02AF } }
---@type table<string, integer[][]>
local localeRanges = {
    el = { { 0x0370, 0x03FF } },
    sr = { { 0x0400, 0x04FF } },
    he = { { 0x05D0, 0x05EA } },
    ar = { { 0x0620, 0x063F }, { 0x0641, 0x064A }, { 0x066E, 0x066F }, { 0x0671, 0x06D3 }, { 0x06D5, 0x06D5 }, { 0x0750, 0x077F }, { 0x08A0, 0x08BD } },
    ['zh-cn'] = { { 0x4E00, 0x9FFF } },
}

--- Whether a name holds only letters of the server's language (ESX's `esx:locale`), spaces and dashes (and digits
--- with `allowDigits`).
---@param str string
---@param allowDigits? boolean
---@return boolean
function ESX.IsValidLocaleString(str, allowDigits)
    if type(str) ~= 'string' or not utf8.len(str) then return false end
    local ranges = { table.unpack(defaultRanges) }
    if allowDigits then ranges[#ranges + 1] = { 0x0030, 0x0039 } end
    for _, range in ipairs(localeRanges[string.lower(ESX.GetConfig('Locale') or 'en')] or {}) do ranges[#ranges + 1] = range end
    for _, code in utf8.codes(str) do
        local valid = false
        for i = 1, #ranges do
            if code >= ranges[i][1] and code <= ranges[i][2] then
                valid = true
                break
            end
        end
        if not valid then return false end
    end
    return true
end
