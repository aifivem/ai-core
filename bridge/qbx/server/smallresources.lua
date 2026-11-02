-- qbx_smallresources' server side (ai-core provides the name): the hunger / thirst exports and the consumables net
-- events QB / Qbox food scripts and inventories send, onto ai-core's needs (ai-core keeps hunger and thirst, any HUD
-- draws them). Qbox's meaning: `add*` adds, `set*` sets; ox_inventory's old QB bridge sends the new value to `add*`.

local core = Bridge.core
local RESOURCE = 'qbx_smallresources'

---@param value any
---@return number|nil
local function finite(value)
    local n = tonumber(value)
    if not n or n ~= n or n == math.huge or n == -math.huge then return nil end
    return n
end

---@param source integer
---@param need 'hunger'|'thirst'
---@param value any 0-100, clamped
---@return boolean
local function setNeed(source, need, value)
    local n = finite(value)
    if not n or not Bridge.players[source] then return false end
    return core:SetNeed(source, need, math.min(100, math.max(0, n))) == true
end

---@param source integer
---@param need 'hunger'|'thirst'
---@param amount any -100..100, clamped (a QB script's "current + value" fills the need)
---@return boolean
local function addNeed(source, need, amount)
    local n = finite(amount)
    if not n or not Bridge.players[source] then return false end
    n = math.min(100, math.max(-100, n))
    if n == 0 then return true end
    return core:AddNeed(source, need, n) == true
end

for need, name in pairs({ hunger = 'Hunger', thirst = 'Thirst' }) do
    local set = function(source, amount) return setNeed(tonumber(source) or 0, need, amount) end
    local add = function(source, amount) return addNeed(tonumber(source) or 0, need, amount) end
    Bridge.provideExport(RESOURCE, 'Set' .. name, set)
    Bridge.provideExport(RESOURCE, 'Add' .. name, add)
    Bridge.provideExport(RESOURCE, 'set' .. name, set)
    Bridge.provideExport(RESOURCE, 'add' .. name, add)

    -- Only the player's own client (no invoking resource) changes its needs, through the bridge's rate gate.
    RegisterNetEvent('consumables:server:set' .. name, function(amount)
        local src = source
        if GetInvokingResource() or not Bridge.allow(src) then return end
        setNeed(src, need, amount)
    end)
    RegisterNetEvent('consumables:server:add' .. name, function(amount)
        local src = tonumber(source) or 0
        local resource = GetInvokingResource()
        if resource == 'ox_inventory' then
            setNeed(src, need, amount)
        elseif not resource and Bridge.allow(src) then
            addNeed(src, need, amount)
        end
    end)
end
