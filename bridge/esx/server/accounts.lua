-- ESX on ai-core, server side: ESX's accounts from ai-core's. ESX's `money` account is ai-core's `cash`; every other
-- account keeps its name.

local core = Bridge.core

---@param account string
---@return string
local function aiAccount(account) return account == 'money' and 'cash' or account end
---@param account string
---@return string
local function esxAccount(account) return account == 'cash' and 'money' or account end
BridgeESX.aiAccount, BridgeESX.esxAccount = aiAccount, esxAccount

---@class ESXAccount
---@field name string
---@field money number
---@field label string
---@field round boolean
---@field index integer

--- ai-core's account types (labels), read again at most every 30 s (panel content, rarely changed).
---@type table<string, { label: string }>|nil
local accountTypes
local accountTypesAt = 0

---@return table<string, { label: string }>
local function accountLabels()
    local now = GetGameTimer()
    if not accountTypes or now - accountTypesAt > 30000 then
        accountTypes = core:GetAccountTypes() or {}
        accountTypesAt = now
    end
    return accountTypes
end

---@param mirror BridgeMirror
---@return ESXAccount[]
local function accountsOf(mirror)
    local types = accountLabels()
    local names = {}
    for name in pairs(mirror.money) do names[#names + 1] = name end
    table.sort(names)
    local out = {}
    for i, name in ipairs(names) do
        out[i] = { name = esxAccount(name), money = mirror.money[name], label = types[name] and types[name].label or name, round = true, index = i }
    end
    return out
end
BridgeESX.accountsOf = accountsOf
