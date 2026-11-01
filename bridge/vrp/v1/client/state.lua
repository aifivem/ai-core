-- vRP 1 client API on ai-core, player state: health, armour, coma, weapons, customization, police and vehicles
-- (vRP 1.0 `vrp/client/survival.lua`, `player_state.lua`, `police.lua`, `basic_garage.lua`; vRP 2 `vRP.EXT.Survival`,
-- `PlayerState`, `Police`). Coma = ai-core's medical layer (`IsDead`); handcuffs = the `cuffed` player state bag
-- (ai-police). Weapons are inventory items (owner decision): the server's `vRPclient.getWeapons / giveWeapons /
-- replaceWeapons` run on the server (lib/Tunnel.lua); a client script can read the held weapon but not give one.

local tvRP = BridgeVRPClient.tvRP

---@type table<string, true>
local warned = {}

---@param key string
---@param text string
local function warnOnce(key, text)
    if warned[key] then return end
    warned[key] = true
    print(('^3[vRP] %s^0'):format(text))
end

-- Health ------------------------------------------------------------------------------------------------------------

---@return integer
function tvRP.getHealth()
    return GetEntityHealth(aiLib.cache.ped)
end

---@param health any
function tvRP.setHealth(health)
    local n = tonumber(health)
    if n then SetEntityHealth(aiLib.cache.ped, math.floor(n)) end
end

---@param variation any
function tvRP.varyHealth(variation)
    local n = tonumber(variation)
    if not n then return end
    local ped = aiLib.cache.ped
    SetEntityHealth(ped, math.floor(GetEntityHealth(ped) + n))
end

---@param amount any 0-100
function tvRP.setArmour(amount)
    local n = tonumber(amount)
    if n then SetPedArmour(aiLib.cache.ped, math.floor(math.min(100, math.max(0, n)))) end
end

---@return integer
function tvRP.getArmour()
    return GetPedArmour(aiLib.cache.ped)
end

--- Down (ai-core's medical layer, the active death script).
---@return boolean
function tvRP.isInComa()
    return exports['ai-core']:IsDead() == true
end

--- vRP ends the coma at once; on ai-core the death script owns the down state, so this does nothing.
function tvRP.killComa()
    warnOnce('killComa', 'killComa is not answered: the death script owns the down state')
end

---@param flag any
function tvRP.setFriendlyFire(flag)
    local on = flag and true or false
    NetworkSetFriendlyFireOption(on)
    SetCanAttackFriendly(aiLib.cache.ped, on, on)
end

--- Wanted level reactions of the game police.
---@param flag any
function tvRP.setPolice(flag)
    local player = aiLib.cache.playerId
    SetPoliceIgnorePlayer(player, not flag)
    SetDispatchCopsForPlayer(player, flag and true or false)
end

---@param flag any
function tvRP.setCop(flag)
    SetPedAsCop(aiLib.cache.ped, flag and true or false)
end

-- Police ------------------------------------------------------------------------------------------------------------

--- The shared `cuffed` player bag (`PLAYER_BAGS.cuffed`); a raw read on demand only (ai-lib's Lua side has no state
--- bag class), never in a loop.
---@return boolean
function tvRP.isHandcuffed()
    return LocalPlayer.state.cuffed == true
end

--- Handcuffs belong to the police script (ai-police keeps them on the server); vRP's calls do nothing.
function tvRP.toggleHandcuff()
    warnOnce('handcuff', 'toggleHandcuff / setHandcuffed are not answered: cuffs belong to the police script')
end

---@param _flag any
function tvRP.setHandcuffed(_flag)
    tvRP.toggleHandcuff()
end

-- Vehicles ------------------------------------------------------------------------------------------------------------

---@return boolean
function tvRP.isInVehicle()
    return IsPedSittingInAnyVehicle(aiLib.cache.ped)
end

--- The closest vehicle within `radius` metres (the one the ped sits in first), nil when none.
---@param radius any
---@return integer|nil
function tvRP.getNearestVehicle(radius)
    local vehicle = aiLib.nearestVehicle(tonumber(radius) or 0, { networked = false })
    return vehicle ~= 0 and vehicle or nil
end

BridgeVRPClient.warnOnce = warnOnce
