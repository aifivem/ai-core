---Characters by id through ai-core, loaded or not, like the TypeScript lib's `characters`. Calls that wait (marked)
---run from a thread; writes answer `{ ok = true }` or `{ ok = false, error = <ai-core lang key> }`.
local core = exports['ai-core']

---Runs a callback export and waits for its answer (`fallback` when ai-core is not there).
---@param fallback any
---@param call fun(done: fun(value: any))
local function wait(fallback, call)
    local p = promise.new()
    local ok = pcall(call, function(value) p:resolve(value) end)
    if not ok then return fallback end
    return Citizen.Await(p)
end

-- ai-core not answering: the same refusal as a wrong argument
local FAILED = { ok = false, error = 'CORE_ERR_ARGS' }
local resource = GetCurrentResourceName()

return {
    ---Characters by a typed text, loaded or not: name prefixes ("first last" too), citizenid, fivem / license /
    ---discord id; `{ characters = { charId, citizenid, firstname, lastname, source? }[], next? }`, 25 a page newest
    ---first (`cursor` = the last page's `next`). Waits.
    ---@param text string
    ---@param cursor? integer
    search = function(text, cursor)
        return wait({ characters = {} }, function(done) core:SearchCharacters(text, done, cursor) end)
    end,
    ---Info, money, jobs, gangs, metadata and position of a character; nil when unknown or deleted. Waits.
    ---@param charId integer
    get = function(charId) return wait(nil, function(done) core:GetOfflineCharacter(charId, done) end) end,
    ---The characters of an account id or license. Waits.
    ofUser = function(user) return wait({}, function(done) core:GetCharactersOfUser(user, done) end) end,
    ---Holders of a job, loaded or not, a page at a time (`after` = the last page's `next`). Waits.
    jobMembers = function(job, after, limit)
        return wait({ members = {} }, function(done) core:GetJobMembers(job, done, after, limit) end)
    end,
    gangMembers = function(gang, after, limit)
        return wait({ members = {} }, function(done) core:GetGangMembers(gang, done, after, limit) end)
    end,
    ---Money of a character loaded or not, with a ledger row (`reason` defaults to this resource). Waits.
    addMoney = function(charId, account, amount, reason)
        return wait(FAILED, function(done) core:AddOfflineMoney(charId, account, amount, reason or resource, done) end)
    end,
    ---Refused below zero unless the account type allows it. Waits.
    removeMoney = function(charId, account, amount, reason)
        return wait(FAILED, function(done) core:RemoveOfflineMoney(charId, account, amount, reason or resource, done) end)
    end,
    setMoney = function(charId, account, amount, reason)
        return wait(FAILED, function(done) core:SetOfflineMoney(charId, account, amount, reason or resource, done) end)
    end,
    ---Adds or regrades a job under the panel's job rules. Waits.
    setJob = function(charId, job, grade) return wait(FAILED, function(done) core:SetOfflineJob(charId, job, grade, done) end) end,
    removeJob = function(charId, job) return wait(FAILED, function(done) core:RemoveOfflineJob(charId, job, done) end) end,
    setGang = function(charId, gang, grade) return wait(FAILED, function(done) core:SetOfflineGang(charId, gang, grade, done) end) end,
    removeGang = function(charId, gang) return wait(FAILED, function(done) core:RemoveOfflineGang(charId, gang, done) end) end,
    ---One metadata value (nil removes it). Waits.
    setMeta = function(charId, key, value) return wait(FAILED, function(done) core:SetOfflineMeta(charId, key, value, done) end) end,
    ---Name, birth date, nationality, sex (sex only while not loaded). Waits.
    setInfo = function(charId, patch) return wait(FAILED, function(done) core:SetCharacterInfo(charId, patch, done) end) end,
    ---Soft delete; refused while the character is loaded. Waits.
    remove = function(charId, by) return wait(FAILED, function(done) core:DeleteCharacter(charId, by, done) end) end,
    ---Seconds played by a loaded player (server id) or `{ charId }`; nil when unknown. Waits.
    playTime = function(target) return wait(nil, function(done) core:GetPlayTime(target, done) end) end,
    ---Writes a loaded player's position and metadata now; false when not loaded. Waits.
    save = function(src) return wait(false, function(done) core:SavePlayer(src, done) end) end,
    ---A stored character's spawn point; false while loaded or on wrong values.
    setOfflinePosition = function(charId, position) return core:SetOfflinePosition(charId, position) end,
    ---Turns a loaded player's paycheck off or on until the character unloads.
    setPaycheck = function(src, on) return core:SetPaycheckEnabled(src, on) end,
    isPaid = function(src) return core:IsPaycheckEnabled(src) end,
}
