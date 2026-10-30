---The ground height under x / y, probing down from `z` (default 1000): nil while the collision there is not loaded.
---@param x number
---@param y number
---@param z? number
---@return number?
return function(x, y, z)
    local found, ground = GetGroundZFor_3dCoord(x, y, z or 1000.0, false)
    if found then return ground end
    return nil
end
