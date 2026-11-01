-- vRP 1 client API on ai-core, weapons and customization (vRP 1.0 `vrp/client/player_state.lua`, vRP 2
-- `PlayerState`). Weapons are inventory items (owner decision): a client script can read the held weapon but not
-- give one.

local tvRP = BridgeVRPClient.tvRP
local warnOnce = BridgeVRPClient.warnOnce

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
