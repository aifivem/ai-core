-- ESX on ai-core, server side: the xPlayer's weapon methods (added by build.lua). Weapons are the weapon items of the
-- inventory; ammo, components and tint their metadata.

local core = Bridge.core
local weaponItem, loadoutOf = BridgeESX.weaponItem, BridgeESX.loadoutOf

---@param self table the xPlayer being built
---@param source integer
function BridgeESX.xPlayerWeapons(self, source)
    -- Weapons: weapon items of the inventory
    function self.getLoadout(minimal)
        self.loadout = (loadoutOf(source))
        if not minimal then return self.loadout end
        local out = {}
        for _, weapon in ipairs(self.loadout) do
            local entry = { ammo = weapon.ammo }
            if weapon.tintIndex > 0 then entry.tintIndex = weapon.tintIndex end
            if #weapon.components > 0 then entry.components = weapon.components end
            out[weapon.name] = entry
        end
        return out
    end
    function self.getWeapon(weaponName)
        if type(weaponName) ~= 'string' then return nil, nil end
        local upper = weaponName:upper()
        for i, weapon in ipairs((loadoutOf(source))) do
            if weapon.name == upper then return i, weapon end
        end
        return nil, nil
    end
    function self.hasWeapon(weaponName) return select(2, self.getWeapon(weaponName)) ~= nil end
    function self.addWeapon(weaponName, ammo)
        local item = weaponItem(weaponName)
        if not item or self.hasWeapon(weaponName) then return false end
        return core:AddItem(source, item, 1, { ammo = math.max(0, math.floor(tonumber(ammo) or 0)) }) == true
    end
    function self.removeWeapon(weaponName)
        local index = self.getWeapon(weaponName)
        if not index then return false end
        local _, stacks = loadoutOf(source)
        local stack = stacks[index]
        return stack ~= nil and core:RemoveItem(source, stack.name, 1, nil, stack.slot) == true
    end
    function self.getWeaponTint(weaponName)
        local _, weapon = self.getWeapon(weaponName)
        return weapon and weapon.tintIndex or 0
    end
    function self.hasWeaponComponent(weaponName, weaponComponent)
        local _, weapon = self.getWeapon(weaponName)
        if not weapon then return false end
        local find = rawget(ESX, 'GetWeaponComponent')
        local component = find and find(weaponName, weaponComponent)
        local hash = component and component.hash and tostring(component.hash)
        for _, owned in ipairs(weapon.components) do
            if owned == weaponComponent or (hash and tostring(owned) == hash) then return true end
        end
        return false
    end
    --- Ammo, components and tint are the weapon item's metadata (`ammo`, `components`, `tint`), replaced on its stack
    --- through ai-core's inventory layer (`SetItemMetadata`). `change(metadata)` edits a copy and answers false to stop.
    ---@param weaponName string
    ---@param change fun(metadata: table): boolean
    ---@return boolean
    local function changeWeapon(weaponName, change)
        local index = self.getWeapon(weaponName)
        if not index then return false end
        local _, stacks = loadoutOf(source)
        local stack = stacks[index]
        if not stack then return false end
        local metadata = {}
        for key, value in pairs(type(stack.metadata) == 'table' and stack.metadata or {}) do metadata[key] = value end
        if not change(metadata) then return false end
        return core:SetItemMetadata(source, stack.slot, metadata) == true
    end
    ---@param weaponName string
    ---@param ammo integer
    local function setPedAmmo(weaponName, ammo)
        local p = GetPlayerPed(tostring(source))
        if p ~= 0 then SetPedAmmo(p, joaat(weaponName:upper()), ammo) end
    end
    ---@param value any
    ---@return integer|nil
    local function ammoCount(value)
        value = tonumber(value)
        if not value or value ~= value or value < 0 or value > 100000 then return nil end
        return math.floor(value)
    end
    function self.addWeaponAmmo(weaponName, ammoCount2)
        local add, ammo = ammoCount(ammoCount2), 0
        if not add then return false end
        local ok = changeWeapon(weaponName, function(metadata)
            ammo = math.min(100000, (tonumber(metadata.ammo) or 0) + add)
            metadata.ammo = ammo
            return true
        end)
        if ok then setPedAmmo(weaponName, ammo) end
        return ok
    end
    function self.removeWeaponAmmo(weaponName, ammoCount2)
        local remove, ammo = ammoCount(ammoCount2), 0
        if not remove then return false end
        local ok = changeWeapon(weaponName, function(metadata)
            ammo = math.max(0, (tonumber(metadata.ammo) or 0) - remove)
            metadata.ammo = ammo
            return true
        end)
        if ok then setPedAmmo(weaponName, ammo) end
        return ok
    end
    --- The ammo the player's client reports (ESX's own sync); a throwable at 0 is used up.
    function self.updateWeaponAmmo(weaponName, ammoCount2)
        local ammo = ammoCount(ammoCount2)
        if not ammo then return false end
        local ok = changeWeapon(weaponName, function(metadata)
            metadata.ammo = ammo
            return true
        end)
        if ok and ammo == 0 then
            local valid, _, weapon = pcall(ESX.GetWeapon, weaponName)
            if valid and weapon and weapon.throwable then self.removeWeapon(weaponName) end
        end
        return ok
    end
    function self.addWeaponComponent(weaponName, weaponComponent)
        local valid, component = pcall(ESX.GetWeaponComponent, weaponName, weaponComponent)
        if not valid or not component or self.hasWeaponComponent(weaponName, weaponComponent) then return false end
        local ok = changeWeapon(weaponName, function(metadata)
            local list = {}
            for i, owned in ipairs(type(metadata.components) == 'table' and metadata.components or {}) do list[i] = owned end
            list[#list + 1] = weaponComponent
            metadata.components = list
            return true
        end)
        if ok then
            local p = GetPlayerPed(tostring(source))
            if p ~= 0 then GiveWeaponComponentToPed(p, joaat(weaponName:upper()), component.hash) end
            self.triggerEvent('esx:showInventoryItemNotification', true, component.label, 1)
        end
        return ok
    end
    function self.removeWeaponComponent(weaponName, weaponComponent)
        local valid, component = pcall(ESX.GetWeaponComponent, weaponName, weaponComponent)
        if not valid or not component or not self.hasWeaponComponent(weaponName, weaponComponent) then return false end
        local ok = changeWeapon(weaponName, function(metadata)
            local list = {}
            for _, owned in ipairs(type(metadata.components) == 'table' and metadata.components or {}) do
                if owned ~= weaponComponent and tostring(owned) ~= tostring(component.hash) then list[#list + 1] = owned end
            end
            metadata.components = list
            return true
        end)
        if ok then
            local p = GetPlayerPed(tostring(source))
            if p ~= 0 then RemoveWeaponComponentFromPed(p, joaat(weaponName:upper()), component.hash) end
            self.triggerEvent('esx:showInventoryItemNotification', false, component.label, 1)
        end
        return ok
    end
    function self.setWeaponTint(weaponName, weaponTintIndex)
        local tint = math.tointeger(tonumber(weaponTintIndex))
        local valid, _, weapon = pcall(ESX.GetWeapon, weaponName)
        if not valid or not tint or not weapon or not weapon.tints or not weapon.tints[tint] then return false end
        local ok = changeWeapon(weaponName, function(metadata)
            metadata.tint = tint
            return true
        end)
        if ok then
            self.triggerEvent('esx:setWeaponTint', weaponName, tint)
            self.triggerEvent('esx:showInventoryItemNotification', true, weapon.tints[tint], 1)
        end
        return ok
    end
end
