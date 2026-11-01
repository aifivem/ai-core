-- qbx_core's money exports: a loaded character through ai-core's wallet, a stored one (citizenid) through the
-- offline Player's money functions (ai-core's offline money exports). Hooks run for both (`source` nil for a stored
-- character, as in Qbox).

local core = Bridge.core
local provide, resolve, moneyAmount, runHooks = BridgeQbox.provide, BridgeQbox.resolve, BridgeQbox.moneyAmount, BridgeQbox.runHooks

---@param event 'addMoney'|'removeMoney'|'setMoney'
---@param method 'AddMoney'|'RemoveMoney'|'SetMoney'
---@return fun(identifier: integer|string, moneyType: string, amount: number, reason?: string): boolean
local function moneyExport(event, method)
    return function(identifier, moneyType, amount, reason)
        local source, offline = resolve(identifier)
        local valid = moneyAmount(amount)
        if not valid or (not source and not offline) then return false end
        local balances = offline and offline.PlayerData.money or Bridge.players[source].money
        if balances[moneyType] == nil then return false end
        if not runHooks(event, { source = source, moneyType = moneyType, amount = valid }) then return false end
        if offline then return offline.Functions[method](moneyType, valid, reason or 'unknown') == true end
        return core[method](core, source, moneyType, valid, reason or 'unknown') == true
    end
end

provide('AddMoney', moneyExport('addMoney', 'AddMoney'))
provide('RemoveMoney', moneyExport('removeMoney', 'RemoveMoney'))
provide('SetMoney', moneyExport('setMoney', 'SetMoney'))
provide('GetMoney', function(identifier, moneyType)
    if not moneyType then return false end
    local source, offline = resolve(identifier)
    local balances = offline and offline.PlayerData.money or source and Bridge.players[source].money
    if not balances or balances[moneyType] == nil then return false end
    return balances[moneyType]
end)
