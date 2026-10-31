-- vRP 1 server API on ai-core, identity and survival. Signatures: vRP 1.0 `vrp/modules/identity.lua` and
-- `vrp/modules/survival.lua` (same names in vRPex, Zirix, Dunko). Identity = the ai-core character (registration =
-- citizenid, phone from ai-core's phone layer); hunger / thirst = ai-hud's needs on vRP's inverted scale
-- (vRP 0-100 with 100 = starving, ai-hud 0-100 with 100 = full).

local core = Bridge.core
local vRP = BridgeVRP.proxy

---@param birthdate string|nil `YYYY-MM-DD`
---@return integer
local function ageOf(birthdate)
    local y, m, d = tostring(birthdate or ''):match('^(%d+)-(%d+)-(%d+)')
    if not y then return 0 end
    local now = os.date('*t') --[[@as osdate]]
    local age = now.year - tonumber(y)
    if now.month < tonumber(m) or (now.month == tonumber(m) and now.day < tonumber(d)) then age = age - 1 end
    return math.max(age, 0)
end

---@param id integer
---@param character AiCharacter
---@param phone string
---@return table
local function identity(id, character, phone)
    return {
        user_id = id,
        firstname = character.firstname,
        name = character.lastname,
        lastname = character.lastname,
        age = ageOf(character.birthdate),
        registration = character.citizenid,
        phone = phone,
    }
end

--- `{ user_id, firstname, name, age, registration, phone }` of a character, loaded or not (a stored one waits for
--- the database unless cached: call inside a thread, as vRP); nil for an unknown id.
---@param user_id any
---@return table|nil
function vRP.getUserIdentity(user_id)
    local id = tonumber(user_id)
    if not id then return nil end
    local mirror, source = BridgeVRP.mirror(id)
    if mirror then return identity(id, mirror.character, core:GetPhoneNumber(source) or '') end
    local info = BridgeVRP.await(function(done) core:GetCharacterInfo(id, done) end)
    if type(info) ~= 'table' then return nil end
    return identity(id, info, '')
end

--- user_id of a loaded character by registration (citizenid); nil otherwise.
---@param registration any
---@return integer|nil
function vRP.getUserByRegistration(registration)
    if type(registration) ~= 'string' then return nil end
    local source = Bridge.sourceByCitizenId(registration)
    return source and BridgeVRP.userId(source) or nil
end

--- user_id of the loaded character with this phone number (ai-core's phone layer); nil otherwise.
---@param phone any
---@return integer|nil
function vRP.getUserByPhone(phone)
    if phone == nil then return nil end
    local source = core:GetSourceByPhone(tostring(phone))
    return source and BridgeVRP.userId(source) or nil
end

-- Survival ------------------------------------------------------------------------------------------------------------

---@param value any
---@return number
local function clamp(value)
    return math.min(100, math.max(0, tonumber(value) or 0))
end

---@param user_id any
---@param need 'hunger'|'thirst'
---@return number vRP scale
local function getNeed(user_id, need)
    local mirror = BridgeVRP.mirror(user_id)
    if not mirror then return 0 end
    local value = mirror.metadata[need]
    return 100 - clamp(value == nil and 100 or value)
end

---@param source integer
---@return boolean
local function hudRuns(source)
    return source ~= nil and GetResourceState('ai-hud') == 'started'
end

---@param user_id any
---@param need 'hunger'|'thirst'
---@param value any vRP scale
local function setNeed(user_id, need, value)
    local _, source = BridgeVRP.mirror(user_id)
    if not source or tonumber(value) == nil then return end
    local full = 100 - clamp(value)
    if hudRuns(source) then exports['ai-hud']:SetNeed(source, need, full) else core:SetMeta(source, need, math.floor(full + 0.5)) end
end

---@param user_id any
---@param need 'hunger'|'thirst'
---@param variation any vRP scale (positive = hungrier)
local function varyNeed(user_id, need, variation)
    local _, source = BridgeVRP.mirror(user_id)
    local delta = tonumber(variation)
    if not source or not delta or delta ~= delta then return end
    if hudRuns(source) then
        exports['ai-hud']:AddNeed(source, need, -delta)
    else
        setNeed(user_id, need, getNeed(user_id, need) + delta)
    end
end

---@param user_id any
---@return number
function vRP.getHunger(user_id) return getNeed(user_id, 'hunger') end

---@param user_id any
---@return number
function vRP.getThirst(user_id) return getNeed(user_id, 'thirst') end

---@param user_id any
---@param value any
function vRP.setHunger(user_id, value) setNeed(user_id, 'hunger', value) end

---@param user_id any
---@param value any
function vRP.setThirst(user_id, value) setNeed(user_id, 'thirst', value) end

---@param user_id any
---@param variation any
function vRP.varyHunger(user_id, variation) varyNeed(user_id, 'hunger', variation) end

---@param user_id any
---@param variation any
function vRP.varyThirst(user_id, variation) varyNeed(user_id, 'thirst', variation) end
