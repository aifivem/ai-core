local V = BridgeVRP2
local vRP = V.vRP
local v1, coreExtension = V.v1, V.coreExtension

-- Survival: vitals 0-1 (1 = full); `food` / `water` are ai-hud's hunger / thirst (vRP 1 functions, 0-100 with
-- 100 = starving), vitals other extensions register live in the character's data.
local SurvivalUser = {}
local needs = { food = { 'getHunger', 'setHunger' }, water = { 'getThirst', 'setThirst' } }

---@param name any
---@return number|nil
function SurvivalUser:getVital(name)
    local need = needs[name]
    if need then
        local value = tonumber(v1(need[1], nil, self.cid))
        return value and math.max(0, math.min(1, 1 - value / 100)) or nil
    end
    local own = self.cdata and rawget(self.cdata, 'vitals_extra')
    return type(own) == 'table' and own[name] or nil
end

---@param name any
---@param value any
function SurvivalUser:setVital(name, value)
    local Survival = vRP.EXT.Survival
    value = tonumber(value)
    if not value or not Survival.vitals[name] or not self.cdata then return end
    local overflow
    if value < 0 then
        overflow, value = value, 0
    elseif value > 1 then
        overflow, value = value - 1, 1
    end
    local need = needs[name]
    if need then
        v1(need[2], nil, self.cid, (1 - value) * 100)
    else
        local own = rawget(self.cdata, 'vitals_extra') or {}
        local previous = own[name]
        own[name] = value
        rawset(self.cdata, 'vitals_extra', own)
        if previous ~= value then vRP:triggerEvent('playerVitalChange', self, name) end
    end
    if overflow then vRP:triggerEvent('playerVitalOverflow', self, name, overflow) end
end

---@param name any
---@param value any
function SurvivalUser:varyVital(name, value)
    local current = self:getVital(name)
    if current and tonumber(value) then self:setVital(name, current + value) end
end

local Survival = coreExtension('Survival', { cfg = {}, vitals = { water = { 1 }, food = { 1 } } }, nil, SurvivalUser)

---@param name any
---@param default_value any
function Survival:registerVital(name, default_value)
    if type(name) ~= 'string' or self.vitals[name] then return end
    self.vitals[name] = { tonumber(default_value) or 1 }
    V.track(function() self.vitals[name] = nil end)
end
