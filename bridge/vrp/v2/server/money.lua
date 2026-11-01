local V = BridgeVRP2
local v1, amountOf, coreExtension = V.v1, V.amountOf, V.coreExtension

-- Money: wallet = account `cash`, bank = account `bank` (vRP 1 money functions).
local MoneyUser = {}

---@return integer
function MoneyUser:getWallet() return v1('getMoney', 0, self.cid) or 0 end
---@return integer
function MoneyUser:getBank() return v1('getBankMoney', 0, self.cid) or 0 end
---@param amount any
function MoneyUser:setWallet(amount) return v1('setMoney', false, self.cid, amountOf(amount)) == true end
---@param amount any
function MoneyUser:setBank(amount) return v1('setBankMoney', false, self.cid, amountOf(amount)) == true end
---@param amount any
function MoneyUser:giveWallet(amount) return v1('giveMoney', false, self.cid, amountOf(math.abs(tonumber(amount) or 0))) == true end
---@param amount any
function MoneyUser:giveBank(amount) return v1('giveBankMoney', false, self.cid, amountOf(math.abs(tonumber(amount) or 0))) == true end

--- Pays from the wallet; `dry` only checks.
---@param amount any
---@param dry? boolean
---@return boolean
function MoneyUser:tryPayment(amount, dry)
    amount = amountOf(amount)
    if not amount then return false end
    if dry then return self:getWallet() >= amount end
    return v1('tryPayment', false, self.cid, amount) == true
end

--- Bank to wallet; `dry` only checks.
---@param amount any
---@param dry? boolean
---@return boolean
function MoneyUser:tryWithdraw(amount, dry)
    amount = amountOf(amount)
    if not amount then return false end
    if dry then return self:getBank() >= amount end
    return v1('tryWithdraw', false, self.cid, amount) == true
end

--- Wallet to bank; `dry` only checks.
---@param amount any
---@param dry? boolean
---@return boolean
function MoneyUser:tryDeposit(amount, dry)
    amount = amountOf(amount)
    if not amount then return false end
    if dry then return self:getWallet() >= amount end
    return v1('tryDeposit', false, self.cid, amount) == true
end

--- Wallet first, the rest from the bank; `dry` only checks.
---@param amount any
---@param dry? boolean
---@return boolean
function MoneyUser:tryFullPayment(amount, dry)
    amount = amountOf(amount)
    if not amount then return false end
    if dry then return self:getWallet() + self:getBank() >= amount end
    return v1('tryFullPayment', false, self.cid, amount) == true
end

--- vRP 3: pays from the bank only (amount above 0); `dry` only checks.
---@param amount any
---@param dry? boolean
---@return boolean
function MoneyUser:tryCardPayment(amount, dry)
    amount = amountOf(amount)
    if not amount or amount <= 0 then return false end
    if dry then return self:getBank() >= amount end
    return v1('tryBankPayment', false, self.cid, amount) == true
end

local Money = coreExtension('Money', {
    cfg = { open_wallet = 0, open_bank = 0, money_display = false, money_type = 'USD', currency_symbols = { USD = '$' } },
}, nil, MoneyUser)

--- vRP 3: the wallet amount as vRP's money display shows it.
---@param amount any
---@return string
function Money:formatWallet(amount)
    local symbol = self.cfg.currency_symbols[self.cfg.money_type] or ''
    return ('<span class="symbol">%s</span>%s'):format(symbol, tostring(formatNumber(tonumber(amount) or 0)))
end
