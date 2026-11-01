-- ai-core's framework bridge, server side: logins of character screens (multichar scripts log players in through
-- the framework's login; docs/compat/multichar.md), on ai-core's login exports.

local core = Bridge.core

---@class BridgeNewCharacter
---@field firstname string
---@field lastname string
---@field birthdate string YYYY-MM-DD
---@field sex 'male'|'female'
---@field nationality? string
---@field slot? integer
---@field height? number centimetres, kept in metadata `height`

--- A player who may be logged in by a script: connected, no character loaded, within the bridge's rate gate.
---@param source any
---@return integer|nil
function Bridge.loginSource(source)
    local id = math.tointeger(tonumber(source))
    if not id or id <= 0 or not GetPlayerName(tostring(id)) or Bridge.players[id] then return nil end
    return Bridge.allow(id) and id or nil
end

---@param what string
---@param source integer
---@param result { ok: boolean, error?: string }|nil
---@return boolean
local function loginAnswer(what, source, result)
    if result and result.ok then return true end
    print(('^3[ai-core bridge] %s of player %d (from %s) refused: %s^0'):format(what, source, GetInvokingResource() or '?', result and result.error or 'no answer'))
    return false
end

--- Loads a character of the player's own account (ai-core `LoginCharacter`: char id, `{ slot }` or `{ citizenid }`).
--- Waits; call from a thread.
---@param source integer
---@param character integer|{ slot: integer }|{ citizenid: string }
---@return boolean
function Bridge.login(source, character)
    return loginAnswer('login', source, Bridge.await('LoginCharacter', source, character))
end

--- Creates a character on the player's account (ai-core's form rules and slot limit) and loads it. Waits.
---@param source integer
---@param input BridgeNewCharacter
---@return boolean
function Bridge.createCharacter(source, input)
    local result = Bridge.await('CreateAndLoginCharacter', source, {
        firstname = input.firstname, lastname = input.lastname, birthdate = input.birthdate, sex = input.sex,
        nationality = input.nationality, slot = input.slot,
    })
    if not loginAnswer('character creation', source, result) then return false end
    local height = tonumber(input.height)
    if height and height > 0 and height < 300 and Bridge.players[source] then core:SetMeta(source, 'height', math.floor(height)) end
    return true
end

--- Lets go of the loaded character (ai-core `LogoutCharacter`: saved, the character screen shows again).
---@param source integer
---@param done? fun(ok: boolean)
function Bridge.logout(source, done)
    core:LogoutCharacter(source, function(result)
        if done then done(type(result) == 'table' and result.ok == true) end
    end)
end
