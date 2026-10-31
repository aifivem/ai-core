-- vRP's lib/utils.lua on ai-core: vRP scripts include '@vrp/lib/utils.lua' and ai-core provides vrp, so the include
-- resolves here. The globals of vRP 1.0, 2 and 3 in one file (SERVER, CLIENT, module, async, class, parse helpers,
-- tohex, clone, formatNumber); no profiler.
-- Based on vRP (https://github.com/vRP-framework/vRP, MIT, Copyright (c) 2017 ImagicTheCat; vRP 3:
-- https://github.com/vRP-framework/vRP3-Dev, MIT). The MIT notice is in lib/Luaoop.lua and CREDITS.md.

---@diagnostic disable: lowercase-global

SERVER = IsDuplicityVersion()
CLIENT = not SERVER

--- Lua 5.4 dropped table.maxn; vRP 1.0 code calls it.
---@param t table
---@return integer
function table.maxn(t)
    local max = 0
    for k in pairs(t) do
        local n = tonumber(k)
        if n and n > max then max = n end
    end
    return max
end

-- Every `vrp` file is ai-core's: this file is only ever loaded through ai-core's provide of vrp, so the files it
-- loads are read from ai-core directly (no lookup through the provide, which a stopped `vrp` folder would win).
local VRP_RESOURCE = 'ai-core'

---@type table<string, table>
local modules = {}

--- Loads a Lua file of a resource once and returns what it returns (vRP's `module`). `module(path)` reads from vrp.
---@param rsc string
---@param path? string file path without `.lua`
---@return any ...
function module(rsc, path)
    if path == nil then
        path = rsc
        rsc = 'vrp'
    end
    local key = rsc .. '/' .. path
    local cached = modules[key]
    if cached then return table.unpack(cached, 1, cached.n) end
    local code = LoadResourceFile(rsc == 'vrp' and VRP_RESOURCE or rsc, path .. '.lua')
    if not code then error(('resource file %s/%s.lua not found'):format(rsc, path), 2) end
    local chunk, err = load(code, ('@%s/%s.lua'):format(rsc, path))
    if not chunk then error(('error parsing module %s/%s: %s'):format(rsc, path, err), 2) end
    local rets = table.pack(xpcall(chunk, debug.traceback))
    if not rets[1] then error(('error loading module %s/%s: %s'):format(rsc, path, rets[2]), 2) end
    local values = table.pack(table.unpack(rets, 2, rets.n))
    modules[key] = values
    return table.unpack(values, 1, values.n)
end

class = module('vrp', 'lib/Luaoop').class

---@class VrpAsync
---@field p table promise
---@field r table|nil the returned values once the returner was called
---@field wait fun(self: VrpAsync): ...

---@param self VrpAsync
local function wait(self)
    local r = self.r or Citizen.Await(self.p) or self.r
    if not r then error('async wait(): Citizen.Await returned before the returner was called', 2) end
    return table.unpack(r, 1, r.n or table.maxn(r))
end

---@param self VrpAsync
local function areturn(self, ...)
    self.r = table.pack(...)
    self.p:resolve(self.r)
end

--- `async(fn)` runs fn in a new thread now; `async()` returns a returner `r` (`r(...)` answers, `r:wait()` waits).
---@param func? function
---@return VrpAsync|nil
function async(func)
    if func then
        Citizen.CreateThreadNow(func)
        return nil
    end
    return setmetatable({ wait = wait, p = promise.new() }, { __call = areturn })
end

---@param v any
---@return integer
function parseInt(v)
    local n = tonumber(v)
    return n and math.floor(n) or 0
end

---@param v any
---@return number
function parseDouble(v)
    return tonumber(v) or 0
end

---@param v any
---@return number
function parseFloat(v)
    return parseDouble(v)
end

---@type table<string, table<string, true>>
local sanitizeSets = {}

--- Keeps (allow_policy true) or removes (false) the characters of `strchars` in `str`.
---@param str string
---@param strchars string
---@param allow_policy boolean
---@return string
function sanitizeString(str, strchars, allow_policy)
    local chars = sanitizeSets[strchars]
    if not chars then
        chars = {}
        for i = 1, #strchars do chars[strchars:sub(i, i)] = true end
        sanitizeSets[strchars] = chars
    end
    local out = {}
    for i = 1, #str do
        local char = str:sub(i, i)
        if (allow_policy and chars[char]) or (not allow_policy and not chars[char]) then out[#out + 1] = char end
    end
    return table.concat(out)
end

---@param str string
---@param sep? string pattern class content, default whitespace
---@return string[]
function splitString(str, sep)
    sep = sep or '%s'
    local t = {}
    for part in string.gmatch(str, '([^' .. sep .. ']+)') do t[#t + 1] = part end
    return t
end

---@param list table
---@param sep? string
---@return string
function joinStrings(list, sep)
    local parts = {}
    for _, v in pairs(list) do parts[#parts + 1] = tostring(v) end
    return table.concat(parts, sep or '')
end

---@param c string
---@return string
local function hexByte(c)
    return string.format('%02X', string.byte(c))
end

--- A Lua string as upper-case hexadecimal (binary safe across msgpack and JSON).
---@param str string
---@return string
function tohex(str)
    return (string.gsub(str, '.', hexByte))
end

--- Deep copy (no circular references).
---@generic T
---@param t T
---@return T
function clone(t)
    if type(t) ~= 'table' then return t end
    local new = {}
    for k, v in pairs(t) do new[k] = clone(v) end
    return new
end

--- `1234567.5` -> `1,234,567.5` (vRP 3).
---@param number any
---@return any
function formatNumber(number)
    if type(number) ~= 'number' then return number end
    local _, _, minus, int, fraction = tostring(number):find('([-]?)(%d+)([.]?%d*)')
    int = int:reverse():gsub('(%d%d%d)', '%1,'):reverse():gsub('^,', '')
    return minus .. int .. fraction
end
