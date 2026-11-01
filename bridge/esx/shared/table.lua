-- ESX on ai-core, both sides: ESX.Table, copied from es_extended 1.12.4 / 1.16.3 (GPL-3.0).

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
