-- ESX on ai-core, both sides: ESX.GetRandomString and ESX.DumpTable, copied from es_extended 1.12.4 / 1.16.3 (GPL-3.0).

local charset = {}
for i = 48, 57 do charset[#charset + 1] = string.char(i) end
for i = 65, 90 do charset[#charset + 1] = string.char(i) end
for i = 97, 122 do charset[#charset + 1] = string.char(i) end

---@param length integer
---@return string
function ESX.GetRandomString(length)
    math.randomseed(GetGameTimer())
    local out = {}
    for i = 1, length do out[i] = charset[math.random(1, #charset)] end
    return table.concat(out)
end

---@param value any
---@param nb? integer
---@return string
function ESX.DumpTable(value, nb)
    nb = nb or 0
    if type(value) ~= 'table' then return tostring(value) end
    local s = '{\n'
    for k, v in pairs(value) do
        if type(k) ~= 'number' then k = '"' .. tostring(k) .. '"' end
        s = s .. string.rep('    ', nb) .. '[' .. k .. '] = ' .. ESX.DumpTable(v, nb + 1) .. ',\n'
    end
    return s .. string.rep('    ', nb) .. '}'
end
