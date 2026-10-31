---Bills through ai-core's billing layer (tgiann-phone, okokBilling... else ai-core's own bills), like the TypeScript
---lib's `billing`. Texts are already translated.
---@class AiLibBill
---@field to? integer the player who gets it (or `toCitizenid`)
---@field toCitizenid? string the character who gets it by citizen id, also offline (stored only by ai-core's own bills)
---@field amount integer whole dollars
---@field label string what it is for
---@field from? integer the issuing player (a bill without `job` pays this player)
---@field job? string the job whose account gets the payment

local core = exports['ai-core']
return {
    ---Sends a bill; false when it is invalid or the billing script refused it.
    ---@param bill AiLibBill
    ---@return boolean
    send = function(bill) return core:SendBill(bill) end,
    ---The player's open bills (`{ id, label, amount, sender }`), nil when the billing script cannot list them. Waits:
    ---call it from a thread.
    ---@param src integer
    ---@return table[]?
    unpaid = function(src)
        local p = promise.new()
        local ok = pcall(core.GetUnpaidBills, core, src, function(bills) p:resolve(bills) end)
        if not ok then return nil end
        return Citizen.Await(p)
    end,
    ---The player pays one of their open bills; false when refused or payments happen only in the script's own screen.
    ---@param src integer
    ---@param id string
    ---@return boolean
    pay = function(src, id) return core:PayBill(src, id) end,
    ---@return string?
    provider = function() return core:GetBillingSystem() end,
}
