-- QBCore.Functions screen text, street and zone names, heading, time and ground (qb-core client/functions.lua,
-- GPL-3.0).

local F = QBCore.Functions

---@param x number
---@param y number
---@param width number
---@param height number
---@param scale number
---@param r integer
---@param g integer
---@param b integer
---@param a integer
---@param text string
function F.DrawText(x, y, width, height, scale, r, g, b, a, text)
    SetTextFont(4)
    SetTextScale(scale, scale)
    SetTextColour(r, g, b, a)
    BeginTextCommandDisplayText('STRING')
    AddTextComponentSubstringPlayerName(text)
    EndTextCommandDisplayText(x - width / 2, y - height / 2 + 0.005)
end

---@param x number
---@param y number
---@param z number
---@param text string
function F.DrawText3D(x, y, z, text)
    SetTextScale(0.35, 0.35)
    SetTextFont(4)
    SetTextProportional(true)
    SetTextColour(255, 255, 255, 215)
    BeginTextCommandDisplayText('STRING')
    SetTextCentre(true)
    AddTextComponentSubstringPlayerName(text)
    SetDrawOrigin(x, y, z, 0)
    EndTextCommandDisplayText(0.0, 0.0)
    DrawRect(0.0, 0.0125, 0.017 + text:len() / 370, 0.03, 0, 0, 0, 75)
    ClearDrawOrigin()
end

---@param coords vector3|table
---@return { main: string, cross: string }
function F.GetStreetNametAtCoords(coords)
    local location = aiLib.locationName(vector3(coords.x, coords.y, coords.z))
    return { main = location.street, cross = location.crossing or '' }
end

---@param coords vector3
---@return string
function F.GetZoneAtCoords(coords) return aiLib.locationName(vector3(coords.x, coords.y, coords.z)).zone end

---@param entity? integer
---@return string
function F.GetCardinalDirection(entity)
    entity = entity and DoesEntityExist(entity) and entity or PlayerPedId()
    local heading = GetEntityHeading(entity)
    if heading < 45 or heading >= 315 then return 'North' end
    if heading < 135 then return 'West' end
    if heading < 225 then return 'South' end
    return 'East'
end

---@return { min: integer, hour: integer, ampm?: string, formattedHour?: integer, formattedMin?: string }
function F.GetCurrentTime()
    local obj = { min = GetClockMinutes(), hour = GetClockHours() }
    if obj.hour <= 12 then
        obj.ampm = 'AM'
    else
        obj.ampm, obj.formattedHour = 'PM', obj.hour - 12
    end
    if obj.min <= 9 then obj.formattedMin = '0' .. obj.min end
    return obj
end

---@param coords vector3|table
---@return vector3|table|nil
function F.GetGroundZCoord(coords)
    if not coords then return end
    local ground = aiLib.groundZ(coords.x, coords.y, coords.z)
    return ground and vector3(coords.x, coords.y, ground) or coords
end

---@param entity integer
function F.GetGroundHash(entity)
    local coords = GetEntityCoords(entity)
    local test = StartShapeTestCapsule(coords.x, coords.y, coords.z + 4, coords.x, coords.y, coords.z - 2.0, 1, 1, entity, 7)
    local retval, success, endCoords, surfaceNormal, materialHash, entityHit = GetShapeTestResultEx(test)
    return materialHash, entityHit, surfaceNormal, endCoords, success, retval
end
