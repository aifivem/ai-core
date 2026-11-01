-- QB's generated ids (citizenid, fingerprint, wallet, serial, account and phone numbers) and the per-character
-- values made once and kept in ai-core's metadata.

---@param length integer
---@param charset string
---@return string
local function randomFrom(length, charset)
    local out = {}
    for i = 1, length do
        local n = math.random(#charset)
        out[i] = charset:sub(n, n)
    end
    return table.concat(out)
end

local LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
local DIGITS = '0123456789'

-- QB's id generators. qb-core checks each against its `players` table; ai-core keeps no such table, so these draw from
-- the same large random spaces without a database check (ai-core's own citizenid is the character's row id).
---@return string
function QBCore.Player.CreateCitizenId() return (randomFrom(3, LETTERS) .. randomFrom(5, DIGITS)):upper() end
---@return string
function QBCore.Player.CreateFingerId()
    return randomFrom(2, LETTERS) .. randomFrom(3, DIGITS) .. randomFrom(1, LETTERS) .. randomFrom(2, DIGITS) .. randomFrom(3, LETTERS) .. randomFrom(4, DIGITS)
end
---@return string
function QBCore.Player.CreateWalletId() return 'QB-' .. math.random(11111111, 99999999) end
---@return integer
function QBCore.Player.CreateSerialNumber() return math.random(11111111, 99999999) end
---@return string
function QBCore.Functions.CreateAccountNumber()
    return 'US0' .. math.random(1, 9) .. 'QBCore' .. math.random(1111, 9999) .. math.random(1111, 9999) .. math.random(11, 99)
end
---@return string
function QBCore.Functions.CreatePhoneNumber() return math.random(100, 999) .. math.random(1000000, 9999999) end

--- QB's per-character values made once and kept in ai-core's metadata.
---@type table<string, fun(): any>
BridgeQB.generatedMeta = {
    bloodtype = function()
        local types = QBCore.Config.Player.Bloodtypes
        return types[math.random(#types)]
    end,
    fingerprint = function() return QBCore.Player.CreateFingerId() end,
    walletid = function() return QBCore.Player.CreateWalletId() end,
    phonedata = function() return { SerialNumber = QBCore.Player.CreateSerialNumber(), InstalledApps = {} } end,
}
