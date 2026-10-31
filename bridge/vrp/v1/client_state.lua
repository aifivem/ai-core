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

-- Weapons -------------------------------------------------------------------------------------------------------------

--- The held weapon as `{ [WEAPON_X] = { ammo } }` (vRP's shape; the full list is the inventory's).
---@return table<string, { ammo: integer }>
function tvRP.getWeapons()
    local out = {}
    local weapon = aiLib.cache.weapon
    if not weapon then return out end
    local held = exports['ai-core']:GetCurrentWeapon()
    if type(held) == 'table' and type(held.name) == 'string' then
        out[held.name:upper()] = { ammo = GetAmmoInPedWeapon(aiLib.cache.ped, weapon) }
    end
    return out
end

--- Weapons are inventory items given by the server: a client cannot give them.
function tvRP.giveWeapons()
    warnOnce('giveWeapons', 'giveWeapons from a client is refused: weapons are inventory items (call vRPclient.giveWeapons from the server)')
end

---@return table
function tvRP.replaceWeapons()
    tvRP.giveWeapons()
    return tvRP.getWeapons()
end

-- Customization (vRP's native format: `[index] = { drawable, texture, palette }`, `p<index>` props, `modelhash`) --

--- `true, index` for a prop key (`p0`), `false, index` for a component.
---@param key any
---@return boolean
---@return integer|nil
local function part(key)
    if type(key) == 'string' and key:sub(1, 1) == 'p' then return true, tonumber(key:sub(2)) end
    return false, tonumber(key)
end

---@param key any
---@return integer
function tvRP.getDrawables(key)
    local isProp, index = part(key)
    if not index then return 0 end
    local ped = aiLib.cache.ped
    return isProp and GetNumberOfPedPropDrawableVariations(ped, index) or GetNumberOfPedDrawableVariations(ped, index)
end

---@param key any
---@param drawable any
---@return integer
function tvRP.getDrawableTextures(key, drawable)
    local isProp, index = part(key)
    drawable = tonumber(drawable)
    if not index or not drawable then return 0 end
    local ped = aiLib.cache.ped
    return isProp and GetNumberOfPedPropTextureVariations(ped, index, drawable) or GetNumberOfPedTextureVariations(ped, index, drawable)
end

--- The ped's look in vRP's format.
---@return table
function tvRP.getCustomization()
    local ped = aiLib.cache.ped
    local custom = { modelhash = GetEntityModel(ped) }
    for i = 0, 20 do custom[i] = { GetPedDrawableVariation(ped, i), GetPedTextureVariation(ped, i), GetPedPaletteVariation(ped, i) } end
    for i = 0, 10 do custom['p' .. i] = { GetPedPropIndex(ped, i), math.max(GetPedPropTextureIndex(ped, i), 0) } end
    return custom
end

--- Applies the parts given (and `modelhash` / `model`); the look is shown, not saved (the clothing script keeps
--- the saved look).
---@param custom any
function tvRP.setCustomization(custom)
    if type(custom) ~= 'table' then return end
    local hash = tonumber(custom.modelhash) or (type(custom.model) == 'string' and GetHashKey(custom.model)) or nil
    if hash and hash ~= GetEntityModel(aiLib.cache.ped) and aiLib.requestModel(hash) then
        local armour = GetPedArmour(aiLib.cache.ped)
        SetPlayerModel(PlayerId(), hash)
        SetModelAsNoLongerNeeded(hash)
        SetPedArmour(PlayerPedId(), armour) -- the new ped (aiLib.cache.ped still names the old one)
    end
    local ped = PlayerPedId() -- a new model made a new ped; aiLib.cache follows it only within 100 ms
    for key, value in pairs(custom) do
        if key ~= 'model' and key ~= 'modelhash' and type(value) == 'table' then
            local isProp, index = part(key)
            local drawable, texture = tonumber(value[1]), tonumber(value[2]) or 0
            if index and drawable then
                if isProp then
                    if drawable < 0 then ClearPedProp(ped, index) else SetPedPropIndex(ped, index, drawable, texture, true) end
                else
                    SetPedComponentVariation(ped, index, drawable, texture, tonumber(value[3]) or 2)
                end
            end
        end
    end
end
