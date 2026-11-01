-- vRP 1 server API on ai-core, a player's inventory and chests through ai-core's inventory layer. Weights:
-- inventories count grams, vRP kilograms.

local core = Bridge.core
local vRP = BridgeVRP.proxy

--- Max weight answered when the active inventory does not tell it (kg): large, so the inventory itself decides.
local UNKNOWN_MAX_WEIGHT = 100000
local idOf = BridgeVRP.idOf

--- A whole amount above 0, else nil.
---@param value any
---@return integer|nil
local function countOf(value)
    local n = tonumber(value)
    if not n or n ~= n or n == math.huge or n < 1 then return nil end
    return math.floor(n)
end

--- Gives an item (vRP's `notify` text is not shown: the inventory shows its own changes).
---@param user_id any
---@param idname any
---@param amount any
---@return boolean
function vRP.giveInventoryItem(user_id, idname, amount)
    local _, source = BridgeVRP.mirror(user_id)
    local item, count = BridgeVRP.itemOf(idname), countOf(amount)
    if not source or not item or not count then return false end
    return core:AddItem(source, item, count) == true
end

--- Takes an item only when the character holds enough.
---@param user_id any
---@param idname any
---@param amount any
---@return boolean
function vRP.tryGetInventoryItem(user_id, idname, amount)
    local _, source = BridgeVRP.mirror(user_id)
    local item, count = BridgeVRP.itemOf(idname), countOf(amount)
    if not source or not item or not count then return false end
    if (core:GetItemCount(source, item) or 0) < count then return false end
    return core:RemoveItem(source, item, count) == true
end

---@param user_id any
---@param idname any
---@return integer
function vRP.getInventoryItemAmount(user_id, idname)
    local _, source = BridgeVRP.mirror(user_id)
    local item = BridgeVRP.itemOf(idname)
    if not source or not item then return 0 end
    return core:GetItemCount(source, item) or 0
end

--- `{ [idname] = { amount } }` of every item the character carries; nil when the character is not loaded.
---@param user_id any
---@return table<string, { amount: integer }>|nil
function vRP.getInventory(user_id)
    local _, source = BridgeVRP.mirror(user_id)
    if not source then return nil end
    local out = {}
    for _, stack in ipairs(core:GetItems(source) or {}) do
        local id = idOf(stack.name)
        local entry = out[id]
        if entry then entry.amount = entry.amount + stack.count else out[id] = { amount = stack.count } end
    end
    return out
end

---@param source integer
---@return { weight: number, maxWeight: number }|nil grams
local function weightOf(source)
    local answer = core:GetInventoryWeight(source)
    if type(answer) == 'table' and type(answer.weight) == 'number' and type(answer.maxWeight) == 'number' then return answer end
    return nil
end

--- Carried weight in kg.
---@param user_id any
---@return number
function vRP.getInventoryWeight(user_id)
    local _, source = BridgeVRP.mirror(user_id)
    if not source then return 0 end
    local answer = weightOf(source)
    if answer then return answer.weight / 1000 end
    return vRP.computeItemsWeight(vRP.getInventory(user_id))
end

--- Weight limit in kg (a large number when the active inventory does not tell it).
---@param user_id any
---@return number
function vRP.getInventoryMaxWeight(user_id)
    local _, source = BridgeVRP.mirror(user_id)
    if not source then return 0 end
    local answer = weightOf(source)
    return answer and answer.maxWeight / 1000 or UNKNOWN_MAX_WEIGHT
end

---@param user_id any
function vRP.clearInventory(user_id)
    local _, source = BridgeVRP.mirror(user_id)
    if source then core:ClearInventory(source) end
end

---@type table<string, integer> stash -> registered max weight (grams); ai-core keeps stashes across inventory restarts
local stashes = {}

--- Opens a chest as an inventory stash `vrp_<name>` (`max_weight` in kg). `cb_close`, `cb_in`, `cb_out` are not
--- called: the inventory layer has no per-stash move hook.
---@param source any
---@param name any
---@param max_weight any
function vRP.openChest(source, name, max_weight)
    source = tonumber(source)
    if not source or not Bridge.players[source] or type(name) ~= 'string' or name == '' then return end
    local stash = 'vrp_' .. name
    local grams = math.floor((tonumber(max_weight) or 100) * 1000)
    if stashes[stash] ~= grams then
        stashes[stash] = grams
        core:RegisterStash(stash, name, 50, grams)
    end
    core:OpenInventory(source, stash)
end
