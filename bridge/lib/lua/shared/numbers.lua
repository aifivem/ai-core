-- Number helpers shared by both sides, like the TypeScript lib's `round` / `groupDigits` / `headingTo`.
local numbers = {}

---Rounds to `decimals` places (default 0).
---@param value number
---@param decimals? integer
---@return number
function numbers.round(value, decimals)
    local power = 10 ^ (decimals or 0)
    return math.floor(value * power + 0.5) / power
end

---`1234567` as `1,234,567` (`separator` default `,`); keeps a sign and decimals.
---@param value number|string
---@param separator? string
---@return string
function numbers.groupDigits(value, separator)
    local left, digits, right = tostring(value):match('^([^%d]*%d)(%d*)(.-)$')
    if not left then return tostring(value) end
    return left .. digits:reverse():gsub('(%d%d%d)', '%1' .. (separator or ','):reverse()):reverse() .. right
end

---The heading (0-360, GTA's: 0 = north, counter-clockwise) that faces from `from` towards `to`.
---@param from vector3|{x: number, y: number}
---@param to vector3|{x: number, y: number}
---@return number
function numbers.headingTo(from, to)
    return (math.deg(math.atan(to.x - from.x, to.y - from.y)) * -1 + 360) % 360
end

return numbers
