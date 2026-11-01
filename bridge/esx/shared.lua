-- ESX on ai-core, both sides: es_extended's shared helpers (ESX.Math, ESX.Table, ESX.SetTimeout, the small utility
-- functions, the weapon lookups and IsValidLocaleString), copied from es_extended 1.12.4 / 1.16.3 (GPL-3.0).

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

--- Calls `conditionFunc` every frame until it answers a truthy value or `timeoutMs` (default 1000) passes.
---@param conditionFunc function
---@param errorMessage? string
---@param timeoutMs? integer
---@return boolean, any
function ESX.Await(conditionFunc, errorMessage, timeoutMs)
    timeoutMs = timeoutMs or 1000
    if not ESX.IsFunctionReference(conditionFunc) then error('Condition Function should be a function reference.') end
    local invoker = GetInvokingResource()
    local result = aiLib.waitFor(function() return conditionFunc() or nil end, timeoutMs)
    if result then return true, result end
    if errorMessage then error(('[%s] -> %s'):format(invoker, errorMessage)) end
    return false
end

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

ESX.Table = {}

---@param t table
---@return integer
function ESX.Table.SizeOf(t)
    local count = 0
    for _ in pairs(t) do count = count + 1 end
    return count
end

---@param t table
---@return table
function ESX.Table.Set(t)
    local set = {}
    for _, v in ipairs(t) do set[v] = true end
    return set
end

---@param t table
---@param value any
---@return integer
function ESX.Table.IndexOf(t, value)
    for i = 1, #t do
        if t[i] == value then return i end
    end
    return -1
end

---@param t table
---@param value any
---@return integer
function ESX.Table.LastIndexOf(t, value)
    for i = #t, 1, -1 do
        if t[i] == value then return i end
    end
    return -1
end

---@param t table
---@param cb function
---@return any
function ESX.Table.Find(t, cb)
    for i = 1, #t do
        if cb(t[i]) then return t[i] end
    end
end

---@param t table
---@param cb function
---@return integer
function ESX.Table.FindIndex(t, cb)
    for i = 1, #t do
        if cb(t[i]) then return i end
    end
    return -1
end

---@param t table
---@param cb function
---@return table
function ESX.Table.Filter(t, cb)
    local out = {}
    for i = 1, #t do
        if cb(t[i]) then out[#out + 1] = t[i] end
    end
    return out
end

---@param t table
---@param cb function
---@return table
function ESX.Table.Map(t, cb)
    local out = {}
    for i = 1, #t do out[i] = cb(t[i], i) end
    return out
end

---@param t table
---@return table
function ESX.Table.Reverse(t)
    local out = {}
    for i = #t, 1, -1 do out[#out + 1] = t[i] end
    return out
end

---@param t any
---@return any
function ESX.Table.Clone(t)
    if type(t) ~= 'table' then return t end
    local out = {}
    for k, v in pairs(t) do out[k] = ESX.Table.Clone(v) end
    return setmetatable(out, getmetatable(t))
end

---@param t1 table
---@param t2 table
---@return table
function ESX.Table.Concat(t1, t2)
    local out = ESX.Table.Clone(t1)
    for i = 1, #t2 do out[#out + 1] = t2[i] end
    return out
end

---@param t table
---@param sep? string
---@return string
function ESX.Table.Join(t, sep)
    local parts = {}
    for i = 1, #t do parts[i] = tostring(t[i]) end
    return table.concat(parts, sep or ',')
end

---@param tab table
---@param val any
---@return boolean
function ESX.Table.TableContains(tab, val)
    if type(val) == 'table' then
        for _, value in pairs(tab) do
            if ESX.Table.TableContains(val, value) then return true end
        end
        return false
    end
    for _, value in pairs(tab) do
        if value == val then return true end
    end
    return false
end

--- An iterator over `t` in key order (`order(t, a, b)` decides when given).
---@param t table
---@param order? function
---@return function
function ESX.Table.Sort(t, order)
    local keys = {}
    for k in pairs(t) do keys[#keys + 1] = k end
    if order then
        table.sort(keys, function(a, b) return order(t, a, b) end)
    else
        table.sort(keys)
    end
    local i = 0
    return function()
        i = i + 1
        if keys[i] then return keys[i], t[keys[i]] end
    end
end

---@param t table
---@return table
function ESX.Table.ToArray(t)
    local out = {}
    for _, v in pairs(t) do out[#out + 1] = v end
    return out
end

---@param t table
---@return table
function ESX.Table.Wipe(t)
    for k in pairs(t) do t[k] = nil end
    return t
end

local timeoutCount = 0
---@type table<integer, boolean>
local cancelledTimeouts = {}

---@param msec integer
---@param cb function
---@return integer
function ESX.SetTimeout(msec, cb)
    timeoutCount = timeoutCount + 1
    local id = timeoutCount
    SetTimeout(msec, function()
        if cancelledTimeouts[id] then
            cancelledTimeouts[id] = nil
            return
        end
        cb()
    end)
    return id
end

---@param id integer
function ESX.ClearTimeout(id) cancelledTimeouts[id] = true end

-- Weapons (es_extended shared/modules/weapons.lua) -----------------------------------------------------------------

---@class ESXWeaponComponent
---@field name string
---@field label string
---@field hash integer

---@class ESXWeapon
---@field name string
---@field label string
---@field components ESXWeaponComponent[]
---@field ammo? { label: string, hash: integer }
---@field tints? table<integer, string>
---@field throwable? boolean

---@class ESXWeaponConfig
---@field Weapons ESXWeapon[]
---@field DefaultWeaponTints table<integer, string>
---@field MK2WeaponTints table<integer, string>

---@type ESXWeaponConfig|nil
local weaponConfig
---@type table<string, integer>
local weaponsByName = {}
---@type table<integer, ESXWeapon>
local weaponsByHash = {}

--- ESX's weapon list with English labels (bridge/esx/weapons.lua), read on the first weapon lookup. Also the source of
--- `Weapons`, `DefaultWeaponTints` and `MK2WeaponTints` in both sides' `ESX.GetConfig()`.
---@return ESXWeaponConfig
function BridgeESXWeapons()
    if weaponConfig then return weaponConfig end
    local path = 'bridge/esx/weapons.lua'
    local chunk, err = load(LoadResourceFile(GetCurrentResourceName(), path) or 'return {}', ('@@ai-core/%s'):format(path))
    if not chunk then error(err) end
    local config = chunk() or {}
    config.Weapons = config.Weapons or {}
    for index, weapon in ipairs(config.Weapons) do
        weaponsByName[weapon.name] = index
        weaponsByHash[joaat(weapon.name)] = weapon
    end
    weaponConfig = config --[[@as ESXWeaponConfig]]
    return weaponConfig
end

---@param weaponName string
---@return integer
local function weaponIndex(weaponName)
    BridgeESXWeapons()
    local index = weaponsByName[string.upper(weaponName)]
    assert(index, 'Invalid weapon name!')
    return index
end

---@param weaponName string
---@return integer, ESXWeapon
function ESX.GetWeapon(weaponName)
    local index = weaponIndex(weaponName)
    return index, BridgeESXWeapons().Weapons[index]
end

---@param weaponHash integer|string
---@return ESXWeapon|nil
function ESX.GetWeaponFromHash(weaponHash)
    BridgeESXWeapons()
    return weaponsByHash[type(weaponHash) == 'string' and joaat(weaponHash) or weaponHash]
end

---@param byHash? boolean
---@return ESXWeapon[]|table<integer, ESXWeapon>
function ESX.GetWeaponList(byHash)
    local config = BridgeESXWeapons()
    return byHash and weaponsByHash or config.Weapons
end

---@param weaponName string
---@return string
function ESX.GetWeaponLabel(weaponName)
    return BridgeESXWeapons().Weapons[weaponIndex(weaponName)].label or ''
end

---@param weaponName string
---@param weaponComponent string
---@return ESXWeaponComponent|nil
function ESX.GetWeaponComponent(weaponName, weaponComponent)
    local weapon = BridgeESXWeapons().Weapons[weaponIndex(weaponName)]
    for _, component in ipairs(weapon.components or {}) do
        if component.name == weaponComponent then return component end
    end
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
