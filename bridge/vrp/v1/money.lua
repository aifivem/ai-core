-- vRP 1 server API on ai-core, money: wallet = ai-core account `cash`, bank = account `bank`. Signatures: vRP 1.0
-- `vrp/modules/money.lua` (same names in vRPex, Zirix, vRP 0.5 / Dunko; Dunko adds `tryBankPayment`, Zirix
-- `giveDinheirama`). Amounts are whole numbers (floored); negative amounts are refused; offline ids answer 0 / false.

local core = Bridge.core
local vRP = BridgeVRP.proxy

--- A whole amount of 0 or more, else nil.
---@param value any
---@return integer|nil
local function amountOf(value)
    local n = tonumber(value)
    if not n or n ~= n or n < 0 or n == math.huge then return nil end
    return math.floor(n)
end

--- The ledger reason of a change: the resource that asked.
---@return string
local function reason()
    return 'vrp:' .. BridgeVRP.caller()
end

---@param user_id any
---@param account string
---@return integer
local function balance(user_id, account)
    local mirror = BridgeVRP.mirror(user_id)
    return mirror and math.floor(mirror.money[account] or 0) or 0
end

---@param user_id any
---@param account string
---@param value any
---@return boolean
local function set(user_id, account, value)
    local _, source = BridgeVRP.mirror(user_id)
    local amount = amountOf(value)
    if not source or not amount then return false end
    return core:SetMoney(source, account, amount, reason()) == true
end

---@param user_id any
---@param account string
---@param value any
---@return boolean
local function give(user_id, account, value)
    local _, source = BridgeVRP.mirror(user_id)
    local amount = amountOf(value)
    if not source or not amount or amount <= 0 then return false end
    return core:AddMoney(source, account, amount, reason()) == true
end

--- Takes `value` from an account only when it holds enough (0 always succeeds, as vRP).
---@param user_id any
---@param account string
---@param value any
---@return boolean
local function take(user_id, account, value)
    local mirror, source = BridgeVRP.mirror(user_id)
    local amount = amountOf(value)
    if not mirror or not amount or (mirror.money[account] or 0) < amount then return false end
    if amount == 0 then return true end
    return core:RemoveMoney(source, account, amount, reason()) == true
end

--- Moves money between a character's own accounts in one ledger transaction (0 always succeeds, as vRP).
---@param user_id any
---@param from string
---@param to string
---@param value any
---@return boolean
local function transfer(user_id, from, to, value)
    local mirror, source = BridgeVRP.mirror(user_id)
    local amount = amountOf(value)
    if not mirror or not amount or (mirror.money[from] or 0) < amount then return false end
    if amount == 0 then return true end
    return core:TransferMoney({ source = source, account = from }, { source = source, account = to }, amount, reason()) == true
end

---@param user_id any
---@return integer
function vRP.getMoney(user_id) return balance(user_id, 'cash') end

---@param user_id any
---@param value any
function vRP.setMoney(user_id, value) return set(user_id, 'cash', value) end

---@param user_id any
---@param amount any
function vRP.giveMoney(user_id, amount) return give(user_id, 'cash', amount) end

---@param user_id any
---@param amount any
---@return boolean
function vRP.tryPayment(user_id, amount) return take(user_id, 'cash', amount) end

---@param user_id any
---@return integer
function vRP.getBankMoney(user_id) return balance(user_id, 'bank') end

---@param user_id any
---@param value any
function vRP.setBankMoney(user_id, value) return set(user_id, 'bank', value) end

---@param user_id any
---@param amount any
function vRP.giveBankMoney(user_id, amount) return give(user_id, 'bank', amount) end

--- Dunko: pays from the bank only.
---@param user_id any
---@param amount any
---@return boolean
function vRP.tryBankPayment(user_id, amount) return take(user_id, 'bank', amount) end

--- Bank -> wallet.
---@param user_id any
---@param amount any
---@return boolean
function vRP.tryWithdraw(user_id, amount) return transfer(user_id, 'bank', 'cash', amount) end

--- Wallet -> bank.
---@param user_id any
---@param amount any
---@return boolean
function vRP.tryDeposit(user_id, amount) return transfer(user_id, 'cash', 'bank', amount) end

--- Pays from the wallet, the rest from the bank; nothing is taken when both together are not enough.
---@param user_id any
---@param amount any
---@return boolean
function vRP.tryFullPayment(user_id, amount)
    local mirror, source = BridgeVRP.mirror(user_id)
    local total = amountOf(amount)
    if not mirror or not total then return false end
    local cash = math.floor(mirror.money.cash or 0)
    if cash >= total then return take(user_id, 'cash', total) end
    local rest = total - cash
    if (mirror.money.bank or 0) < rest then return false end
    if cash > 0 and core:RemoveMoney(source, 'cash', cash, reason()) ~= true then return false end
    if core:RemoveMoney(source, 'bank', rest, reason()) == true then return true end
    if cash > 0 then core:AddMoney(source, 'cash', cash, reason()) end
    return false
end

--- Zirix: gives wallet money (Zirix keeps the wallet as an item; on ai-core it is the `cash` account).
---@param user_id any
---@param amount any
function vRP.giveDinheirama(user_id, amount) return give(user_id, 'cash', amount) end
