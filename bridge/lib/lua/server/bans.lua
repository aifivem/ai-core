---Bans through ai-core (checked when a player connects; logged on ai-core's `bans` channel). A target is an online
---player's server id or `{ identifiers = { license, fivem, discord, ip } }`.
local core = exports['ai-core']

---@param fallback any
---@param call fun(done: fun(value: any))
local function wait(fallback, call)
    local p = promise.new()
    local ok = pcall(call, function(value) p:resolve(value) end)
    if not ok then return fallback end
    return Citizen.Await(p)
end

return {
    ---Bans (an online player is dropped at once); `minutes` nil = permanent. The ban id once written, nil when the
    ---arguments are wrong or the write failed (the ban holds from the call either way). Waits.
    ---@param target integer|table
    ---@param reason string
    ---@param minutes? integer
    ---@param by? integer|string
    ---@return integer?
    ban = function(target, reason, minutes, by)
        local p = promise.new()
        local accepted = core:BanPlayer(target, reason, minutes, by, function(id) p:resolve(id) end)
        if not accepted then return nil end
        return Citizen.Await(p)
    end,
    ---Lifts an active ban; false when no active ban has that id.
    ---@return boolean
    unban = function(banId, by) return core:UnbanPlayer(banId, by) end,
    ---Changes an active ban's reason and / or end (`{ reason?, minutes? }`, minutes from now, nil = permanent).
    ---@return boolean
    edit = function(banId, change, by) return core:EditBan(banId, change, by) end,
    ---The active ban of a target, or nil.
    ---@return table?
    isBanned = function(target) return core:IsBanned(target) end,
    ---Active bans, newest first, 50 per page.
    ---@param page? integer
    ---@return table
    list = function(page) return core:GetBans(page or 1) end,
    ---Every ban of a target (active, expired, revoked), newest first, at most 100. Waits.
    ---@return table[]
    history = function(target) return wait({}, function(done) core:GetBanHistory(target, done) end) end,
    ---A page of bans by state and search (`{ filter?, search?, cursor? }`); nil on a wrong query. Waits.
    ---@return table?
    search = function(query) return wait(nil, function(done) core:ListBans(query, done) end) end,
}
