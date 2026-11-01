---Money through ai-core, like the TypeScript lib's `money`: a loaded player's accounts, job / gang accounts, transfers
---and the ledger. Amounts are whole dollars; `reason` defaults to the calling resource.
---@class AiLibMoneyRef
---@field source? integer a loaded player's account (with `account`)
---@field owner? 'job'|'gang'|'character' a job's / gang's account, or a stored character's (ledger only)
---@field id? string the job / gang name, or the character id
---@field account string

local core = exports['ai-core']
return {
    ---A loaded player's balance; nil when not loaded or no such account.
    ---@param src integer
    ---@param account string
    ---@return integer?
    get = function(src, account) return core:GetMoney(src, account) end,
    ---@return boolean
    add = function(src, account, amount, reason) return core:AddMoney(src, account, amount, reason) end,
    ---False when the account cannot pay (or the player is not loaded).
    ---@return boolean
    remove = function(src, account, amount, reason) return core:RemoveMoney(src, account, amount, reason) end,
    ---@return boolean
    set = function(src, account, amount, reason) return core:SetMoney(src, account, amount, reason) end,
    ---A job's or gang's account balance (`bank` is the society money); nil when it has none.
    ---@param type 'job'|'gang'
    ---@param id string
    ---@param account string
    ---@return integer?
    sharedGet = function(type, id, account) return core:GetSharedMoney(type, id, account) end,
    ---@return boolean
    sharedAdd = function(type, id, account, amount, reason) return core:AddSharedMoney(type, id, account, amount, reason) end,
    ---@return boolean
    sharedRemove = function(type, id, account, amount, reason) return core:RemoveSharedMoney(type, id, account, amount, reason) end,
    ---Both changes in one transaction with both ledger rows; `from` also pays `fee`. False when an account is missing,
    ---both are the same or `from` cannot pay.
    ---@param from AiLibMoneyRef
    ---@param to AiLibMoneyRef
    ---@return boolean
    transfer = function(from, to, amount, reason, fee) return core:TransferMoney(from, to, amount, reason, fee) end,
    ---Ledger rows `{ id, amount, balance, reason, actor, at }` (newest first, `at` unix seconds) and the `before` of
    ---the next page. Waits: call it from a thread.
    ---@param account AiLibMoneyRef
    ---@param query? { before?: integer, since?: integer, limit?: integer }
    ---@return { rows: table[], next: integer? }
    history = function(account, query)
        local p = promise.new()
        local ok = pcall(core.GetAccountHistory, core, account, function(page) p:resolve(page) end, query)
        if not ok then return { rows = {} } end
        return Citizen.Await(p)
    end,
}
