-- ESX on ai-core, server side: the xPlayer's money and account methods (added by build.lua), on ai-core's accounts.

local core = Bridge.core
local aiAccount = BridgeESX.aiAccount

---@param value any
---@return boolean
local function validAmount(value)
    return type(value) == 'number' and value == value and value > 0 and value <= 9007199254740991
end

--- xPlayer.setAccountMoney marks the account so the money event it causes is reported as ESX's `esx:setAccountMoney`.
---@type table<integer, table<string, integer>>
BridgeESX.pendingSet = {}
local pendingSet = BridgeESX.pendingSet

---@param self table the xPlayer being built
---@param source integer
---@param mirror BridgeMirror
function BridgeESX.xPlayerMoney(self, source, mirror)
    local pendingOperations, closing = 0, false

    -- Money and accounts
    function self.beginAccountOperation()
        if closing then return false end
        pendingOperations = pendingOperations + 1
        return true
    end
    function self.endAccountOperation() pendingOperations = math.max(0, pendingOperations - 1) end
    function self.beginAccountShutdown() closing = true end
    function self.getPendingAccountOperations() return pendingOperations end
    function self.getAccounts(minimal)
        if not minimal then return self.accounts end
        local out = {}
        for _, account in ipairs(self.accounts) do out[account.name] = account.money end
        return out
    end
    function self.getAccount(account)
        if type(account) ~= 'string' then return nil end
        account = account:lower()
        for _, entry in ipairs(self.accounts) do
            if entry.name:lower() == account then return entry end
        end
        return nil
    end
    function self.getMoney() return mirror.money.cash or 0 end
    function self.addAccountMoney(account, amount, reason)
        if type(account) ~= 'string' or not validAmount(amount) then return false end
        return core:AddMoney(source, aiAccount(account), amount, reason or 'Unknown')
    end
    function self.removeAccountMoney(account, amount, reason)
        amount = tonumber(amount)
        if type(account) ~= 'string' or not validAmount(amount) then return false end
        return core:RemoveMoney(source, aiAccount(account), amount --[[@as number]], reason or 'Unknown')
    end
    function self.setAccountMoney(account, amount, reason)
        if type(account) ~= 'string' or type(amount) ~= 'number' or amount ~= amount or amount < 0 then return false end
        local name = aiAccount(account)
        pendingSet[source] = pendingSet[source] or {}
        pendingSet[source][name] = GetGameTimer() + 1000
        local ok = core:SetMoney(source, name, amount, reason or 'unknown')
        if not ok then pendingSet[source][name] = nil end
        return ok
    end
    --- ESX 1.16.4: takes money when the account holds it; `charged, failure`.
    function self.chargeAccount(account, amount, reason)
        if type(account) ~= 'string' or mirror.money[aiAccount(account)] == nil then return false, 'invalid_account' end
        if not validAmount(amount) then return false, 'invalid_amount' end
        if closing then return false, 'session_closing' end
        if mirror.money[aiAccount(account)] < amount then return false, 'insufficient_funds' end
        if core:RemoveMoney(source, aiAccount(account), amount, reason or 'Unknown') then return true end
        return false, 'failed'
    end
    function self.addMoney(amount, reason) return self.addAccountMoney('money', amount, reason) end
    function self.removeMoney(amount, reason) return self.removeAccountMoney('money', amount, reason) end
    function self.setMoney(amount, reason) return self.setAccountMoney('money', amount, reason) end
end
