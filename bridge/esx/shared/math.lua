-- ESX on ai-core, both sides: ESX.Math (on ai-lib's number helpers), copied from es_extended 1.12.4 / 1.16.3 (GPL-3.0).

ESX.Math = {}

---@param value number
---@param numDecimalPlaces? integer
---@return number
function ESX.Math.Round(value, numDecimalPlaces)
    return aiLib.numbers.round(value, numDecimalPlaces)
end

---@param value number
---@return number
function ESX.Round(value, numDecimalPlaces) return ESX.Math.Round(value, numDecimalPlaces) end

--- `1234567` as `1,234,567`.
---@param value number|string
---@return string
function ESX.Math.GroupDigits(value)
    return aiLib.numbers.groupDigits(value)
end

---@param value any
---@return string
function ESX.Math.Trim(value)
    return (string.gsub(tostring(value), '^%s*(.-)%s*$', '%1'))
end

---@param minRange? integer
---@param maxRange? integer
---@return integer
function ESX.Math.Random(minRange, maxRange)
    math.randomseed(GetGameTimer())
    return math.random(minRange or 1, maxRange or 10)
end

---@param origin vector3|table
---@param target vector3|table
---@return number
function ESX.Math.GetHeadingFromCoords(origin, target)
    return aiLib.numbers.headingTo(origin, target)
end
