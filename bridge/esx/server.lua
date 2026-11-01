-- ESX on ai-core, server side: `exports.es_extended:getSharedObject()`, `esx:getSharedObject`, xPlayer and ESX's
-- server events (es_extended 1.16 public API). ESX's `money` account is ai-core's `cash`; every other account keeps its
-- name. Weapons are inventory items (the loadout is the weapon items of the inventory, ammo / components / tint their
-- metadata). OneSync helpers and extended vehicles: `bridge/esx/server_vehicles.lua`.

local core = Bridge.core

---@param account string
---@return string
local function aiAccount(account) return account == 'money' and 'cash' or account end
---@param account string
---@return string
local function esxAccount(account) return account == 'cash' and 'money' or account end

---@class ESXJob
---@field id integer
---@field name string
---@field label string
---@field grade integer
---@field grade_name string
---@field grade_label string
---@field grade_salary number
---@field skin_male table
---@field skin_female table
---@field onDuty boolean

local esxJob = BridgeShapes.esxJob

---@class ESXAccount
---@field name string
---@field money number
---@field label string
---@field round boolean
---@field index integer

---@class ESXInventoryItem
---@field name string
---@field label string
---@field count number
---@field weight number
---@field usable boolean
---@field rare boolean
---@field canRemove boolean
---@field slot? integer
---@field metadata? table

---@class ESXInventoryWeapon
---@field name string
---@field label string
---@field ammo number
---@field components string[]
---@field tintIndex number

--- ai-core's account types (labels), read again at most every 30 s (panel content, rarely changed).
---@type table<string, { label: string }>|nil
local accountTypes
local accountTypesAt = 0

---@return table<string, { label: string }>
local function accountLabels()
    local now = GetGameTimer()
    if not accountTypes or now - accountTypesAt > 30000 then
        accountTypes = core:GetAccountTypes() or {}
        accountTypesAt = now
    end
    return accountTypes
end

---@param mirror BridgeMirror
---@return ESXAccount[]
local function accountsOf(mirror)
    local types = accountLabels()
    local names = {}
    for name in pairs(mirror.money) do names[#names + 1] = name end
    table.sort(names)
    local out = {}
    for i, name in ipairs(names) do
        out[i] = { name = esxAccount(name), money = mirror.money[name], label = types[name] and types[name].label or name, round = true, index = i }
    end
    return out
end

---@param name string
---@return boolean
local function isWeaponName(name) return type(name) == 'string' and name:upper():sub(1, 7) == 'WEAPON_' end

--- The inventory's item name for an ESX weapon name (`WEAPON_PISTOL`, `weapon_pistol`), nil when it has no such item.
---@param name string
---@return string|nil
local function weaponItem(name)
    if not isWeaponName(name) then return nil end
    for _, candidate in ipairs({ name, name:upper(), name:lower() }) do
        if Bridge.itemDefinition(candidate) then return candidate end
    end
end

---@param source integer
---@return ESXInventoryWeapon[] loadout, table[] stacks the weapon stacks, same order
local function loadoutOf(source)
    local out, stacks = {}, {}
    for _, stack in ipairs(core:GetItems(source) or {}) do
        if isWeaponName(stack.name) then
            local meta = type(stack.metadata) == 'table' and stack.metadata or {}
            out[#out + 1] = {
                name = stack.name:upper(),
                label = stack.label,
                ammo = tonumber(meta.ammo) or 0,
                components = type(meta.components) == 'table' and meta.components or {},
                tintIndex = tonumber(meta.tint) or 0,
            }
            stacks[#stacks + 1] = stack
        end
    end
    return out, stacks
end

---@param source integer
---@return ESXInventoryItem[]
local function inventoryOf(source)
    local out = {}
    for _, stack in ipairs(core:GetItems(source) or {}) do
        local definition = Bridge.itemDefinition(stack.name)
        out[#out + 1] = {
            name = stack.name, label = stack.label, count = stack.count, slot = stack.slot, metadata = stack.metadata,
            weight = definition and definition.weight or 0, usable = true, rare = false, canRemove = true,
        }
    end
    return out
end

---@param value any
---@return boolean
local function validAmount(value)
    return type(value) == 'number' and value == value and value > 0 and value <= 9007199254740991
end

---@param coords any
---@return boolean
local function validCoords(coords)
    local kind = type(coords)
    if kind ~= 'table' and kind ~= 'vector3' and kind ~= 'vector4' then return false end
    for _, axis in ipairs({ coords.x, coords.y, coords.z }) do
        if type(axis) ~= 'number' or axis ~= axis or math.abs(axis) > 10000.0 then return false end
    end
    return true
end

---@class xPlayer
---@field source integer
---@field playerId integer
---@field identifier string citizenid
---@field license string|nil
---@field ssn string from the character id (`XXX-XX-XXXX`)
---@field name string
---@field job ESXJob
---@field group string `admin` with the `ai.admin` ace, else `user`
---@field admin boolean
---@field accounts ESXAccount[] kept current from ai-core's money changes
---@field metadata table ai-core's character metadata (live)
---@field inventory ESXInventoryItem[] refreshed by `getInventory`
---@field loadout ESXInventoryWeapon[] refreshed by `getLoadout`
---@field weight number grams, refreshed by `getWeight`
---@field maxWeight number grams, refreshed by `getMaxWeight`
---@field coords { x: number, y: number, z: number, heading: number }
---@field lastPlaytime number
---@field paycheckEnabled boolean
---@field spawned boolean
---@field variables table
---@field [string] any methods (`getName`, `addAccountMoney`...) and override results

---@type table<integer, xPlayer>
local xPlayers = {}

--- ESX's player function overrides (`ESX.RegisterPlayerFunctionOverrides`): index -> { fnName = fun(xPlayer): function }.
---@type table<string, table<string, fun(self: xPlayer): function>>
local functionOverrides = {}

---@param self table
---@param funcs table<string, fun(self: xPlayer): function>
local function applyOverrides(self, funcs)
    for fnName, fn in pairs(funcs) do
        local ok, result = pcall(fn, self)
        if ok then self[fnName] = result
        else print(('[^3WARNING^7] xPlayer override %s failed: %s'):format(fnName, result)) end
    end
end

--- xPlayer.setAccountMoney marks the account so the money event it causes is reported as ESX's `esx:setAccountMoney`.
---@type table<integer, table<string, integer>>
local pendingSet = {}

---@type table<string, true>
local warned = {}

---@param key string
---@param text string
local function warnOnce(key, text)
    if warned[key] then return end
    warned[key] = true
    print(('[^3WARNING^7] [ai-core ESX bridge] %s'):format(text))
end

---@param source integer
---@return xPlayer|nil
local function build(source)
    local mirror = Bridge.players[source]
    if not mirror then return nil end
    local c = mirror.character
    local ped = GetPlayerPed(tostring(source))
    local at = ped ~= 0 and GetEntityCoords(ped) or vector3(0.0, 0.0, 0.0)
    local id = ('%09d'):format(c.id % 1000000000)
    local weights = core:GetInventoryWeight(source)
    local self = {
        source = source,
        playerId = source,
        identifier = c.citizenid,
        license = Bridge.license(source),
        ssn = ('%s-%s-%s'):format(id:sub(1, 3), id:sub(4, 5), id:sub(6, 9)),
        name = ('%s %s'):format(c.firstname, c.lastname),
        job = esxJob(Bridge.jobOf(mirror)),
        group = Bridge.isAdmin(source) and 'admin' or 'user',
        admin = Bridge.isAdmin(source),
        accounts = accountsOf(mirror),
        metadata = mirror.metadata,
        inventory = inventoryOf(source),
        loadout = (loadoutOf(source)),
        weight = weights and weights.weight or 0,
        maxWeight = weights and weights.maxWeight or 0,
        coords = { x = at.x, y = at.y, z = at.z, heading = ped ~= 0 and GetEntityHeading(ped) or 0.0 },
        lastPlaytime = tonumber(mirror.metadata.lastPlaytime) or 0,
        paycheckEnabled = true,
        spawned = false,
        variables = {},
    }
    local pendingOperations, closing = 0, false

    -- Identity, group, state
    function self.getName() return self.name end
    function self.setName(newName)
        if type(newName) ~= 'string' then return end
        self.name = newName
        Player(source).state:set('name', newName, true)
    end
    function self.getIdentifier() return self.identifier end
    function self.getSSN() return self.ssn end
    function self.getSource() return source end
    self.getPlayerId = self.getSource
    function self.isCurrent() return xPlayers[source] == self end
    function self.isAdmin() return Bridge.isAdmin(source) end
    function self.getGroup() return self.group end
    --- ai-core's admin rights are the `ai.admin` ace (server.cfg / panel), not ESX groups: nothing changes here.
    function self.setGroup(_newGroup)
        warnOnce('setGroup', 'xPlayer.setGroup is ignored: admin rights on ai-core are the ai.admin ace (server.cfg).')
    end
    --- Seconds played by the character (ai-core `GetPlayTime`: saved play time plus this session).
    function self.getPlayTime()
        return tonumber(core:GetPlayTime(source)) or 0
    end
    --- ai-core's paycheck skips the player while off (until the character unloads).
    function self.togglePaycheck(toggle)
        if core:SetPaycheckEnabled(source, toggle == true) then self.paycheckEnabled = toggle == true end
    end
    function self.isPaycheckEnabled() return core:IsPaycheckEnabled(source) == true end
    function self.kick(reason) DropPlayer(tostring(source), reason or '') end
    function self.triggerEvent(eventName, ...) TriggerClientEvent(eventName, source, ...) end
    function self.executeCommand(command)
        if type(command) ~= 'string' then error('xPlayer.executeCommand must be of type string!') end
        self.triggerEvent('esx:executeCommand', command)
    end
    function self.updatePlayerData(key, value) self.triggerEvent('esx:updatePlayerData', key, value) end
    function self.set(key, value, replicate)
        self.variables[key] = value
        if replicate ~= false then self.triggerEvent('esx:updatePlayerData', 'variables', self.variables) end
    end
    function self.get(key) return self.variables[key] end

    -- Position
    function self.getCoords(vector, heading)
        local p = GetPlayerPed(tostring(source))
        if p ~= 0 then
            local now = GetEntityCoords(p)
            self.coords = { x = now.x, y = now.y, z = now.z, heading = GetEntityHeading(p) }
        end
        local at2 = self.coords
        if vector then
            if heading then return vector4(at2.x, at2.y, at2.z, at2.heading) end
            return vector3(at2.x, at2.y, at2.z)
        end
        local out = { x = at2.x, y = at2.y, z = at2.z }
        if heading then out.heading = at2.heading end
        return out
    end
    function self.setCoords(coords)
        if not validCoords(coords) then return false end
        local p = GetPlayerPed(tostring(source))
        if p == 0 then return false end
        local heading = tonumber(coords.w or coords.heading) or GetEntityHeading(p)
        SetEntityCoords(p, coords.x, coords.y, coords.z, false, false, false, false)
        SetEntityHeading(p, heading)
        self.coords = { x = coords.x, y = coords.y, z = coords.z, heading = heading }
    end

    -- Job
    function self.getJob() return self.job end
    function self.setJob(job, grade, onDuty)
        local ok = core:SetJob(source, job, tonumber(grade) or 0)
        if ok and onDuty == true then core:SetDuty(source, job)
        elseif ok and onDuty == false and mirror.duty == job then core:SetDuty(source, nil) end
        return ok
    end
    function self.refreshJob()
        self.job = esxJob(Bridge.jobOf(mirror))
        return true
    end

    -- Money and accounts
    function self.beginAccountOperation()
        if closing then return false end
        pendingOperations = pendingOperations + 1
        return true
    end
    function self.endAccountOperation() pendingOperations = math.max(0, pendingOperations - 1) end
    function self.beginAccountShutdown() closing = true end
    function self.getPendingAccountOperations() return pendingOperations end
    function self.getAccounts(minimal)
        if not minimal then return self.accounts end
        local out = {}
        for _, account in ipairs(self.accounts) do out[account.name] = account.money end
        return out
    end
    function self.getAccount(account)
        if type(account) ~= 'string' then return nil end
        account = account:lower()
        for _, entry in ipairs(self.accounts) do
            if entry.name:lower() == account then return entry end
        end
        return nil
    end
    function self.getMoney() return mirror.money.cash or 0 end
    function self.addAccountMoney(account, amount, reason)
        if type(account) ~= 'string' or not validAmount(amount) then return false end
        return core:AddMoney(source, aiAccount(account), amount, reason or 'Unknown')
    end
    function self.removeAccountMoney(account, amount, reason)
        amount = tonumber(amount)
        if type(account) ~= 'string' or not validAmount(amount) then return false end
        return core:RemoveMoney(source, aiAccount(account), amount --[[@as number]], reason or 'Unknown')
    end
    function self.setAccountMoney(account, amount, reason)
        if type(account) ~= 'string' or type(amount) ~= 'number' or amount ~= amount or amount < 0 then return false end
        local name = aiAccount(account)
        pendingSet[source] = pendingSet[source] or {}
        pendingSet[source][name] = GetGameTimer() + 1000
        local ok = core:SetMoney(source, name, amount, reason or 'unknown')
        if not ok then pendingSet[source][name] = nil end
        return ok
    end
    --- ESX 1.16.4: takes money when the account holds it; `charged, failure`.
    function self.chargeAccount(account, amount, reason)
        if type(account) ~= 'string' or mirror.money[aiAccount(account)] == nil then return false, 'invalid_account' end
        if not validAmount(amount) then return false, 'invalid_amount' end
        if closing then return false, 'session_closing' end
        if mirror.money[aiAccount(account)] < amount then return false, 'insufficient_funds' end
        if core:RemoveMoney(source, aiAccount(account), amount, reason or 'Unknown') then return true end
        return false, 'failed'
    end
    function self.addMoney(amount, reason) return self.addAccountMoney('money', amount, reason) end
    function self.removeMoney(amount, reason) return self.removeAccountMoney('money', amount, reason) end
    function self.setMoney(amount, reason) return self.setAccountMoney('money', amount, reason) end

    -- Inventory (ai-core's inventory layer)
    function self.getInventory(minimal)
        self.inventory = inventoryOf(source)
        if not minimal then return self.inventory end
        local out = {}
        for _, item in ipairs(self.inventory) do out[item.name] = (out[item.name] or 0) + item.count end
        return out
    end
    function self.getInventoryItem(item, metadata)
        local definition = Bridge.itemDefinition(item)
        return {
            name = item,
            label = definition and definition.label or item,
            count = core:GetItemCount(source, item, metadata) or 0,
            weight = definition and definition.weight or 0,
            usable = core:IsUsableItem(item) == true,
            rare = false,
            canRemove = true,
        }
    end
    function self.hasItem(item, metadata)
        local found = self.getInventoryItem(item, metadata)
        if found.count < 1 then return false end
        return found, found.count
    end
    function self.addInventoryItem(item, count, metadata, slot)
        local ok = core:AddItem(source, item, count or 1, metadata, slot)
        if ok then TriggerEvent('esx:onAddInventoryItem', source, item, core:GetItemCount(source, item)) end
        return ok
    end
    function self.removeInventoryItem(item, count, metadata, slot)
        local ok = core:RemoveItem(source, item, count or 1, metadata, slot)
        if ok then TriggerEvent('esx:onRemoveInventoryItem', source, item, core:GetItemCount(source, item)) end
        return ok
    end
    function self.setInventoryItem(item, count, metadata)
        count = tonumber(count)
        if type(item) ~= 'string' or not count or count < 0 then return false end
        count = math.floor(count)
        local have = core:GetItemCount(source, item, metadata) or 0
        if count > have then return self.addInventoryItem(item, count - have, metadata) end
        if count < have then return self.removeInventoryItem(item, have - count, metadata) end
    end
    function self.canCarryItem(item, count, metadata) return core:CanCarryItem(source, item, count or 1, metadata) == true end
    function self.canSwapItem(firstItem, firstItemCount, testItem, testItemCount)
        if (core:GetItemCount(source, firstItem) or 0) < firstItemCount then return false end
        local w = core:GetInventoryWeight(source)
        local first, test = Bridge.itemDefinition(firstItem), Bridge.itemDefinition(testItem)
        if not w or not first or not test then return core:CanCarryItem(source, testItem, testItemCount) == true end
        return w.weight - first.weight * firstItemCount + test.weight * testItemCount <= w.maxWeight
    end
    function self.getWeight()
        local w = core:GetInventoryWeight(source)
        self.weight = w and w.weight or 0
        return self.weight
    end
    function self.getMaxWeight()
        local w = core:GetInventoryWeight(source)
        self.maxWeight = w and w.maxWeight or 0
        return self.maxWeight
    end
    --- The carry limit in grams through ai-core's inventory layer (until the inventory reloads it); false when the
    --- inventory has no way to change it.
    function self.setMaxWeight(newWeight)
        local grams = tonumber(newWeight)
        if not grams or grams ~= grams or grams < 0 or grams == math.huge then return false end
        grams = math.floor(grams)
        if core:SetMaxWeight(source, grams) ~= true then return false end
        self.maxWeight = grams
        self.triggerEvent('esx:setMaxWeight', grams)
        return true
    end
    --- ox_inventory's ESX sync: keeps the reported values on the xPlayer.
    function self.syncInventory(weight, maxWeight, items)
        self.weight, self.maxWeight, self.inventory = weight, maxWeight, items
    end

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

    -- Metadata (ai-core's character metadata)
    function self.getMeta(index, subIndex)
        if not index then return mirror.metadata end
        if type(index) ~= 'string' then return error('xPlayer.getMeta ^5index^1 should be ^5string^1!') end
        local value = mirror.metadata[index]
        if value == nil or not subIndex or type(value) ~= 'table' then return value end
        if type(subIndex) == 'string' then return value[subIndex] end
        if type(subIndex) == 'table' then
            local out = {}
            for _, key in ipairs(subIndex) do
                if type(key) == 'string' then out[key] = value[key] end
            end
            return out
        end
        return error('xPlayer.getMeta subIndex should be ^5string^1 or ^5table^1!')
    end
    function self.setMeta(index, value, subValue)
        if type(index) ~= 'string' then return error('xPlayer.setMeta ^5index^1 should be ^5string^1!') end
        if value == nil then return error('xPlayer.setMeta value is missing!') end
        if subValue == nil then
            local kind = type(value)
            if kind ~= 'number' and kind ~= 'string' and kind ~= 'table' then
                return error('xPlayer.setMeta value should be ^5number^1, ^5string^1 or ^5table^1!')
            end
            core:SetMeta(source, index, value)
            return
        end
        if type(value) ~= 'string' then return error('xPlayer.setMeta ^5value^1 should be ^5string^1 as a subIndex!') end
        local current = mirror.metadata[index]
        local copy = {}
        if type(current) == 'table' then for k, v in pairs(current) do copy[k] = v end end
        copy[value] = subValue
        core:SetMeta(source, index, copy)
    end
    function self.clearMeta(index, subValues)
        if type(index) ~= 'string' then return error('xPlayer.clearMeta ^5index^1 should be ^5string^1!') end
        local current = mirror.metadata[index]
        if current == nil then return end
        if not subValues then
            core:SetMeta(source, index, nil)
            return
        end
        if type(current) ~= 'table' then return error(('xPlayer.clearMeta ^5%s^1 is not a table!'):format(index)) end
        local copy = {}
        for k, v in pairs(current) do copy[k] = v end
        if type(subValues) == 'string' then copy[subValues] = nil
        elseif type(subValues) == 'table' then
            for _, key in ipairs(subValues) do
                if type(key) == 'string' then copy[key] = nil end
            end
        else
            return error('xPlayer.clearMeta ^5subValues^1 should be ^5string^1 or ^5table^1!')
        end
        core:SetMeta(source, index, copy)
    end

    -- Notifications
    function self.showNotification(text, kind, length) Bridge.notify(source, text, kind, length) end
    function self.showHelpNotification(msg, thisFrame, beep, duration) TriggerClientEvent('esx:showHelpNotification', source, msg, thisFrame, beep, duration) end
    function self.showAdvancedNotification(sender, subject, msg, textureDict, iconType, flash, saveToBrief, hudColorIndex)
        TriggerClientEvent('esx:showAdvancedNotification', source, sender, subject, msg, textureDict, iconType, flash, saveToBrief, hudColorIndex)
    end

    for _, funcs in pairs(functionOverrides) do applyOverrides(self, funcs) end
    xPlayers[source] = self --[[@as xPlayer]]
    return self --[[@as xPlayer]]
end

---@param source integer
---@return xPlayer|nil
local function getPlayerFromId(source)
    source = tonumber(source) --[[@as integer]]
    return xPlayers[source] or (Bridge.players[source] and build(source)) or nil
end

---@type table<string, fun(source: integer, cb: function, ...)>
local callbacks = {}

--- ESX's per-job player count (`ESX.GetNumPlayers('job', name)`, GlobalState `<job>:count`), kept from the bridge's
--- job changes.
---@type table<string, integer>
local jobCount = {}

---@param job string|nil
---@param delta integer
local function countJob(job, delta)
    if not job then return end
    local count = math.max(0, (jobCount[job] or 0) + delta)
    jobCount[job] = count > 0 and count or nil
    GlobalState[('%s:count'):format(job)] = count
end

---@class ESXServer
---@field Math table ESX.Math (bridge/esx/shared.lua)
---@field Table table ESX.Table (bridge/esx/shared.lua)
---@field OneSync table ESX.OneSync (bridge/esx/server_vehicles.lua)
---@field Players table<integer, xPlayer>
---@field Jobs table<string, table>
---@field Items table<string, { label: string, weight: number, rare: boolean, canRemove: boolean }>
ESX = { Players = xPlayers, Jobs = {}, Items = {}, OneSync = {} }

ESX.GetPlayerFromId = getPlayerFromId

---@type table<string, integer> license without its prefix -> source of the loaded players
local byLicense = {}
---@type table<integer, string> source -> its key in `byLicense`
local licenseOf = {}

--- The loaded player behind an ESX identifier: the citizenid (`xPlayer.identifier`), or a multichar's
--- `char<slot>:<license>` (the account's character in that slot, while it is the one loaded).
---@param identifier any
---@return integer|nil
local function sourceOfIdentifier(identifier)
    if type(identifier) ~= 'string' then return nil end
    local source = Bridge.sourceByCitizenId(identifier)
    if source then return source end
    local slot, license = identifier:match('^%a*(%d+):(.+)$')
    source = license and byLicense[license]
    local mirror = source and Bridge.players[source]
    return mirror and mirror.character.slot == tonumber(slot) and source or nil
end

---@param identifier string
---@return xPlayer|nil
function ESX.GetPlayerFromIdentifier(identifier)
    local source = sourceOfIdentifier(identifier)
    return source and getPlayerFromId(source) or nil
end

---@return integer[]
function ESX.GetPlayers()
    local out = {}
    for source in pairs(Bridge.players) do out[#out + 1] = source end
    return out
end

---@param x xPlayer
---@param key string
---@param value any
---@return boolean
local function matches(x, key, value)
    return (key == 'job' and x.job.name == value) or x[key] == value
end

--- ESX's filter: no key = every player; `val` a list = a table per value. `minimal` gives server ids.
---@param key? string
---@param val? any
---@param minimal? boolean
---@return xPlayer[]|integer[]|table<any, xPlayer[]|integer[]>
function ESX.GetExtendedPlayers(key, val, minimal)
    local out = {}
    if type(val) == 'table' then
        for _, v in ipairs(val) do out[v] = {} end
    end
    for source in pairs(Bridge.players) do
        local x = getPlayerFromId(source)
        if x then
            local entry = minimal and source or x
            if not key then out[#out + 1] = entry
            elseif type(val) == 'table' then
                for _, v in ipairs(val) do
                    if matches(x, key, v) then out[v][#out[v] + 1] = entry end
                end
            elseif matches(x, key, val) then out[#out + 1] = entry end
        end
    end
    return out
end

--- ESX's static players are the xPlayers here (the same methods).
---@param key? string
---@param val? any
---@return xPlayer[]|table<any, xPlayer[]>
function ESX.ExtendedPlayers(key, val) return ESX.GetExtendedPlayers(key, val) end

---@param key? string
---@param val? any
---@return integer|table<any, integer>
function ESX.GetNumPlayers(key, val)
    if not key then return #GetPlayers() end
    if key == 'job' then
        if type(val) ~= 'table' then return jobCount[val] or 0 end
        local out = {}
        for _, v in ipairs(val) do out[v] = jobCount[v] or 0 end
        return out
    end
    local found = ESX.GetExtendedPlayers(key, val, true)
    if type(val) ~= 'table' then return #found end
    local out = {}
    for v, list in pairs(found) do out[v] = #list end
    return out
end

--- The player's license without its `license:` prefix (ESX's account identifier; xPlayer.identifier is the citizenid).
---@param playerId integer|string
---@return string|nil
function ESX.GetIdentifier(playerId)
    local license = GetPlayerIdentifierByType(tostring(playerId), 'license')
    return license and (license:gsub('^license:', '')) or nil
end

--- ESX's job table from ai-core's job definitions (grades keyed '0', '1'...; `whitelisted` = not listed in the panel).
---@return table<string, table>
local function buildJobs()
    local out = {}
    for name, definition in pairs(Bridge.jobDefinitions()) do
        local grades = {}
        for i, grade in ipairs(definition.grades) do
            grades[tostring(i - 1)] = {
                job_name = name, grade = i - 1, name = (grade.label:lower():gsub('%s+', '_')), label = grade.label,
                salary = grade.salary, skin_male = '{}', skin_female = '{}',
            }
        end
        -- The panel's "listed in the job center" switch: esx_joblisting shows exactly the jobs that are not whitelisted.
        out[name] = { name = name, label = definition.label, type = definition.type, whitelisted = definition.listed ~= true, grades = grades }
    end
    return out
end

---@param jobType? string|string[]
---@return table<string, table>
function ESX.GetJobs(jobType)
    if not jobType then return ESX.Jobs end
    local wanted = {}
    for _, t in ipairs(type(jobType) == 'table' and jobType or { jobType }) do wanted[t] = true end
    local out = {}
    for name, job in pairs(ESX.Jobs) do
        if wanted[job.type] then out[name] = job end
    end
    return out
end

---@param job string
---@param grade integer|string
---@return boolean
function ESX.DoesJobExist(job, grade)
    local definition = Bridge.jobDefinitions()[job]
    return definition ~= nil and definition.grades[(tonumber(grade) or 0) + 1] ~= nil
end

--- Jobs are panel content on ai-core (ai-core keeps ESX.Jobs current after every panel edit): this reads them again.
function ESX.RefreshJobs()
    ESX.Jobs = buildJobs()
    TriggerEvent('esx:jobsRefreshed')
end

---@param jobName string
---@return boolean
function ESX.RefreshJob(jobName)
    if type(jobName) ~= 'string' or jobName == '' then return false end
    ESX.Jobs = buildJobs()
    local job = ESX.Jobs[jobName]
    if not job then return false end
    TriggerEvent('esx:jobRefreshed', jobName, job)
    return true
end

--- A job of the calling script as an ai-core runtime definition (gone when that script stops; listed in job centers,
--- as ESX's `whitelisted` 0). Grades `{ grade, name, label, salary }`; a job the script made before only gets the grades
--- it lacks, as in ESX. ai-core's panel jobs are not changed from here.
---@param name string
---@param label string
---@param grades { grade: integer, name?: string, label?: string, salary?: number }[]
---@param jobType? string
---@return boolean
function ESX.CreateJob(name, label, grades, jobType)
    local owner = GetInvokingResource() or 'ai-core'
    ---@param why string
    ---@return false
    local function refuse(why)
        print(('[^3WARNING^7] [ai-core ESX bridge] ESX.CreateJob(%s) from %s: %s'):format(tostring(name), owner, why))
        return false
    end
    if type(name) ~= 'string' or name == '' then return refuse('missing argument `name`') end
    if type(label) ~= 'string' or label == '' then return refuse('missing argument `label`') end
    if type(grades) ~= 'table' or not next(grades) then return refuse('missing argument `grades`') end
    local mine = Bridge.scriptDefinition('job', name)
    if not mine and Bridge.definitionExists('job', name) then return refuse('the job exists in ai-core\'s admin panel or belongs to another script') end
    local definition = { label = label, type = type(jobType) == 'string' and jobType or 'civ', defaultDuty = true, listed = true, grades = {} }
    if mine then
        definition.label, definition.type = mine.definition.label, mine.definition.type
        for grade, entry in pairs(mine.definition.grades) do definition.grades[grade] = entry end
    end
    local added = false
    for _, grade in pairs(grades) do
        local number = type(grade) == 'table' and Bridge.gradeNumber(grade.grade) or nil
        if not number then return refuse('every grade needs a `grade` number from 0 to 99') end
        if definition.grades[number] == nil then
            local gradeLabel = grade.label or grade.name
            definition.grades[number] = { label = type(gradeLabel) == 'string' and gradeLabel or ('Grade %d'):format(number), salary = math.max(0, math.floor(tonumber(grade.salary) or 0)), boss = grade.name == 'boss' }
            added = true
        end
    end
    if not added then return refuse('the job and its grades exist already') end
    local ok, err = Bridge.putDefinition('job', name, definition, owner)
    if not ok then return refuse(('ai-core refused it (%s)'):format(tostring(err))) end
    ESX.Jobs = buildJobs()
    TriggerEvent('esx:jobCreated', name, ESX.Jobs[name])
    return true
end

---@param name string
---@param cb fun(source: integer, cb: function, ...)
function ESX.RegisterServerCallback(name, cb)
    callbacks[name] = cb
end

---@param name string
---@return boolean
function ESX.DoesServerCallbackExist(name) return callbacks[name] ~= nil end

--- Asks a player's client (`ESX.RegisterClientCallback` there); `cb` gets the first value it answers (nil on timeout).
---@param player integer
---@param eventName string
---@param cb function
function ESX.TriggerClientCallback(player, eventName, cb, ...)
    local args = table.pack(...)
    CreateThread(function()
        local result = aiLib.triggerClientCallback(eventName, player, { table.unpack(args, 1, args.n) })
        cb(result)
    end)
end

--- Waits for a player's client callback (call from a thread); nil on timeout.
---@param player integer
---@param eventName string
---@return any
function ESX.AwaitClientCallback(player, eventName, ...)
    return (aiLib.triggerClientCallback(eventName, player, { ... }))
end

---@param eventName string
---@param playerIds integer|integer[]
function ESX.TriggerClientEvent(eventName, playerIds, ...)
    if type(playerIds) == 'number' then return TriggerClientEvent(eventName, playerIds, ...) end
    for i = 1, #playerIds do TriggerClientEvent(eventName, playerIds[i], ...) end
end

---@param msg string
function ESX.Trace(msg)
    if ESX.GetConfig('EnableDebug') then print(('[^2TRACE^7] %s^7'):format(msg)) end
end

---@param name string
---@param cb fun(source: integer, item?: table)
function ESX.RegisterUsableItem(name, cb)
    core:RegisterUsableItem(name, function(source, item) cb(source, item and item.name, item) end)
end

--- Called by the inventory (ox_inventory, tgiann-inventory) when a player uses an item.
---@param source integer
---@param item string
function ESX.UseItem(source, item, ...)
    Bridge.useItem(source, item, ...)
end

--- Every item a use handler is registered for (ai-core `GetUsableItems`, one call).
---@return table<string, boolean>
function ESX.GetUsableItems()
    local out = {}
    for _, name in ipairs(core:GetUsableItems() or {}) do out[name] = true end
    return out
end

---@param name string
---@return string
function ESX.GetItemLabel(name)
    local definition = Bridge.itemDefinition(name)
    return definition and definition.label or name
end

---@return table<string, { label: string, weight: number, rare: boolean, canRemove: boolean }>
function ESX.GetItems() return ESX.Items end

--- ESX.Items from the active inventory's item definitions; the number of items.
---@return integer
function ESX.RefreshItems()
    local items, count = {}, 0
    for name, definition in pairs(Bridge.itemDefinitions()) do
        items[name] = { label = definition.label, weight = definition.weight, rare = false, canRemove = true }
        count = count + 1
    end
    ESX.Items = items
    return count
end

--- Items are the inventory's own definitions on ai-core; a script cannot add one here.
---@param items table[]
function ESX.AddItems(items)
    local _ = items
    warnOnce('AddItems', ('ESX.AddItems from %s is not answered: add the items in the inventory.'):format(GetInvokingResource() or '?'))
end

--- ai-core has no ESX ground pickups (drops belong to the inventory): no pickup is made.
---@return integer|nil pickupId
function ESX.CreatePickup(...)
    local _ = ...
    warnOnce('CreatePickup', ('ESX.CreatePickup from %s is not answered: drops are made by the inventory.'):format(GetInvokingResource() or '?'))
    return nil
end

--- ESX's Discord log, through ai-core's logs (the panel picks Discord, Fivemanage, console...). Channel = `name`.
---@param name string
---@param title string
---@param color string
---@param message string
function ESX.DiscordLog(name, title, color, message)
    aiLib.aiLog(tostring(name or 'default'), ('%s: %s'):format(tostring(title), tostring(message)), { metadata = { color = color } })
end

---@param name string
---@param title string
---@param color string
---@param fields { name: string, value: any, inline?: boolean }[]
function ESX.DiscordLogFields(name, title, color, fields)
    local metadata = { color = color }
    for _, field in ipairs(type(fields) == 'table' and fields or {}) do metadata[tostring(field.name)] = tostring(field.value) end
    aiLib.aiLog(tostring(name or 'default'), tostring(title), { metadata = metadata })
end

---@param name string|string[]
---@param group string|string[]
---@param cb fun(xPlayer: xPlayer|false, args: table, showError: fun(msg: string))
---@param allowConsole? boolean
function ESX.RegisterCommand(name, group, cb, allowConsole)
    aiLib.addCommand(name, { restricted = group ~= 'user' }, function(source, _, raw)
        if source == 0 and not allowConsole then return end
        cb(source ~= 0 and getPlayerFromId(source) or false, Bridge.words(raw), function(msg) Bridge.notify(source, msg, 'error') end)
    end)
end

function ESX.GetExtendedPlayerCount() return #ESX.GetPlayers() end

--- The player object by server id or identifier (ESX's static player): the same functions as xPlayer.
---@param source integer|string
---@return xPlayer|nil
function ESX.Player(source)
    if type(source) == 'string' then return ESX.GetPlayerFromIdentifier(source) end
    return getPlayerFromId(source)
end

---@param source integer
---@return boolean
function ESX.IsPlayerLoaded(source) return Bridge.players[tonumber(source)] ~= nil end

---@param identifier string
---@return integer|nil
function ESX.GetPlayerIdFromIdentifier(identifier) return sourceOfIdentifier(identifier) end

--- Replaces xPlayer functions (an inventory's item functions): each `overrides[fnName](xPlayer)` returns the new
--- function. Applied to every xPlayer built from now on and to the loaded ones (a restarted script registers again).
---@param index string
---@param overrides table<string, fun(self: xPlayer): function>
function ESX.RegisterPlayerFunctionOverrides(index, overrides)
    if type(index) ~= 'string' or type(overrides) ~= 'table' then return end
    functionOverrides[index] = overrides
    for _, x in pairs(xPlayers) do applyOverrides(x, overrides) end
end

--- ESX picks one override set here; every registered set is applied already (as in current ESX).
---@param index string
function ESX.SetPlayerFunctionOverride(index)
    if not index or not functionOverrides[index] then print('[^3WARNING^7] No valid index provided.') end
end

---@param key? string
function ESX.GetConfig(key)
    local config = { Locale = GetConvar('esx:locale', 'en'), EnableDebug = false, CustomInventory = true, Multichar = true, DistanceGive = 4.0, DefaultJobDuty = true }
    -- ESX's weapon tables (bridge/esx/shared.lua), loaded only when asked for.
    if key == 'Weapons' or key == 'DefaultWeaponTints' or key == 'MK2WeaponTints' then return BridgeESXWeapons()[key] end
    if key then return config[key] end
    local weapons = BridgeESXWeapons()
    config.Weapons, config.DefaultWeaponTints, config.MK2WeaponTints = weapons.Weapons, weapons.DefaultWeaponTints, weapons.MK2WeaponTints
    return config
end

--- Saves the player now (ai-core `SavePlayer`: position and metadata, then its queued money and membership writes);
--- `esx:playerSaved` and `cb(success)` follow the save.
---@param playerId integer
---@param cb? fun(success: boolean)
local function savePlayer(playerId, cb)
    local x = getPlayerFromId(playerId)
    if not x then
        if cb then cb(false) end
        return
    end
    core:SavePlayer(x.source, function(ok)
        if ok then TriggerEvent('esx:playerSaved', x.source, x) end
        if cb then cb(ok == true) end
    end)
end

Bridge.provideExport('es_extended', 'getSharedObject', function() return ESX end)
Bridge.provideExport('es_extended', 'SavePlayer', savePlayer)
--- `ESX.Player(src).method(...)` of es_extended's own imports.lua.
Bridge.provideExport('es_extended', 'RunStaticPlayerMethod', function(src, method, ...)
    local x = getPlayerFromId(src)
    if not x then return end
    if not ESX.IsFunctionReference(x[method]) then error(('Attempted to call invalid method on playerId %s: %s'):format(src, method)) end
    return x[method](...)
end)
--- Runs `action(xPlayer)` as one account operation (ai-core keeps the data; nothing else is locked).
Bridge.provideExport('es_extended', 'WithPlayerPersistence', function(identifier, action)
    local x = ESX.GetPlayerFromIdentifier(identifier)
    if x and not x.beginAccountOperation() then return false, 'session_closing' end
    local ok, result, detail = pcall(action, x)
    if x then x.endAccountOperation() end
    if not ok then
        print(('[es_extended] Persistence operation failed: %s'):format(tostring(result)))
        return false, result
    end
    return result, detail
end)
--- ESX's job vehicle storage writes its own `owned_vehicles` table, which ai-core does not have: nothing is stored.
Bridge.provideExport('es_extended', 'StoreJobVehicle', function() return false end)

RegisterNetEvent('esx:triggerServerCallback', function(name, requestId, invoker, ...)
    local src = source
    if type(name) ~= 'string' or not Bridge.allow(src) then return end
    local cb = callbacks[name]
    if not cb then return end
    cb(src, function(...)
        TriggerClientEvent('esx:serverCallback', src, requestId, invoker, ...)
    end, ...)
end)

AddEventHandler('esx:getSharedObject', function(cb)
    cb(ESX)
end)

-- es_extended's own server callbacks.
---@param x xPlayer
---@return table
local function playerData(x)
    return { identifier = x.identifier, accounts = x.getAccounts(), inventory = x.getInventory(), job = x.getJob(), loadout = x.getLoadout(), money = x.getMoney(), position = x.getCoords(true), metadata = x.getMeta() }
end
callbacks['esx:getPlayerData'] = function(source, cb)
    local x = getPlayerFromId(source)
    cb(x and playerData(x) or nil)
end
callbacks['esx:isUserAdmin'] = function(source, cb) cb(Bridge.isAdmin(source)) end
callbacks['esx:getGameBuild'] = function(_, cb) cb(tonumber(GetConvar('sv_enforceGameBuild', '1604'))) end
callbacks['esx:getOtherPlayerData'] = function(source, cb, target)
    local x = Bridge.isAdmin(source) and getPlayerFromId(target) or nil
    cb(x and playerData(x) or nil)
end
callbacks['esx:getPlayerNames'] = function(source, cb, players)
    if type(players) ~= 'table' then return cb({}) end
    local out = {}
    for playerId in pairs(players) do
        local x = playerId ~= source and getPlayerFromId(playerId) or nil
        if x then out[playerId] = x.getName() end
    end
    cb(out)
end

-- Item use and give from ESX inventory menus (ai-core's inventory gate rules: rate, loaded players, distance, counts).
aiLib.onClientEvent('esx:useItem', function(src, itemName)
    if type(itemName) ~= 'string' or #itemName > 100 or not Bridge.players[src] then return end
    if (core:GetItemCount(src, itemName) or 0) < 1 then return end
    Bridge.useItem(src, itemName)
end, { rate = { count = 5, windowMs = 1000 } })

---@param value any
---@return integer|nil
local function positiveCount(value)
    value = tonumber(value)
    if not value or value ~= value or value < 1 or value > 1000000 then return nil end
    return math.floor(value)
end

aiLib.onClientEvent('esx:giveInventoryItem', function(src, target, itemType, itemName, itemCount)
    target = tonumber(target)
    if not target or target == src or type(itemName) ~= 'string' or itemName == '' or #itemName > 100 then return end
    if not Bridge.players[src] or not Bridge.players[target] then return end
    local from, to = GetPlayerPed(tostring(src)), GetPlayerPed(tostring(target))
    if from == 0 or to == 0 or GetPlayerRoutingBucket(tostring(src)) ~= GetPlayerRoutingBucket(tostring(target)) then return end
    if #(GetEntityCoords(from) - GetEntityCoords(to)) > 4.0 then return end
    if itemType == 'item_standard' then
        local count = positiveCount(itemCount)
        if not count or (core:GetItemCount(src, itemName) or 0) < count or not core:CanCarryItem(target, itemName, count) then return end
        if not core:RemoveItem(src, itemName, count) then return end
        if not core:AddItem(target, itemName, count) then core:AddItem(src, itemName, count) end
    elseif itemType == 'item_account' then
        local count = positiveCount(itemCount)
        if not count or (itemName ~= 'money' and itemName ~= 'black_money') then return end
        core:TransferMoney({ source = src, account = aiAccount(itemName) }, { source = target, account = aiAccount(itemName) }, count, 'esx give')
    elseif itemType == 'item_weapon' then
        local x = getPlayerFromId(src)
        local index = x and x.getWeapon(itemName)
        if not index then return end
        local _, stacks = loadoutOf(src)
        local stack = stacks[index]
        if not stack or not core:CanCarryItem(target, stack.name, 1, stack.metadata) then return end
        if not core:RemoveItem(src, stack.name, 1, stack.metadata, stack.slot) then return end
        if not core:AddItem(target, stack.name, 1, stack.metadata) then core:AddItem(src, stack.name, 1, stack.metadata) end
    end
end, { rate = { count = 3, windowMs = 1000 } })

aiLib.onClientEvent('esx:onPlayerSpawn', function(src)
    local x = xPlayers[src]
    if x then x.spawned = true end
end, { rate = { count = 2, windowMs = 1000 } })

AddEventHandler('ai-core:playerSpawned', function(src)
    local x = xPlayers[src]
    if x then x.spawned = true end
end)

-- ESX's drop request: ai-core saves and unloads characters itself; the caller's callback runs.
AddEventHandler('esx:onPlayerDropped', function(_, _, cb)
    if cb then cb() end
end)

-- ESX's own ammo sync (es_extended's client reports the ammo left): only a weapon the player holds, never more ammo
-- than its item has.
aiLib.onClientEvent('esx:updateWeaponAmmo', function(src, weaponName, ammo)
    ammo = tonumber(ammo)
    if type(weaponName) ~= 'string' or #weaponName > 64 or not ammo or ammo < 0 or ammo > 100000 or ammo ~= math.floor(ammo) then return end
    local x = xPlayers[src]
    if not x then return end
    local _, weapon = x.getWeapon(weaponName)
    if not weapon or ammo > weapon.ammo then return end
    x.updateWeaponAmmo(weaponName, ammo)
end, { rate = { count = 10, windowMs = 1000 } })

-- Character screens in ESX mode (esx_multicharacter, tgiann-multichar, 0r): `esx:onPlayerJoined(src, 'char<N>', data?)`
-- loads the account's character in slot N, or creates it from `data` (esx_identity's fields); a server event only, as
-- in es_extended's multichar mode. docs/compat/multichar.md.
AddEventHandler('esx:onPlayerJoined', function(src, char, data)
    -- A client cannot raise it (never a net event here); `source` is a player id only for one that came from a client.
    if (tonumber(source) or 0) > 0 then return end
    local id = Bridge.loginSource(src)
    local slot = type(char) == 'string' and math.tointeger(tonumber(char:match('^%a*(%d+)$') or char:match('^%a*(%d+):') or ''))
    if not id or not slot or slot < 1 then return end
    local license = type(char) == 'string' and char:match(':(.+)$')
    if license and license ~= ESX.GetIdentifier(id) then return end
    if type(data) ~= 'table' then
        Bridge.login(id, { slot = slot })
        return
    end
    Bridge.createCharacter(id, {
        firstname = tostring(data.firstname or ''),
        lastname = tostring(data.lastname or ''),
        birthdate = Bridge.isoDate(data.dateofbirth) or '',
        sex = Bridge.sexOf(data.sex),
        slot = slot,
        height = tonumber(data.height),
    })
end)

--- Players whose logout a script asked for with `esx:playerLogout` (the unload then does not raise it again).
---@type table<integer, true>
local logoutAsked = {}
--- The bridge raises `esx:playerLogout` itself for listeners when a character unloads; its own raise is not a request.
local raisingLogout = false

-- A character screen's logout: ai-core saves and unloads the character (`LogoutCharacter`), then `cb` runs.
AddEventHandler('esx:playerLogout', function(playerId, cb)
    if raisingLogout or (tonumber(source) or 0) > 0 then return end
    local id = math.tointeger(tonumber(playerId))
    if not id or not Bridge.players[id] then
        if cb then cb() end
        return
    end
    logoutAsked[id] = true
    Bridge.logout(id, function(ok)
        if not ok then logoutAsked[id] = nil end
        if cb then cb() end
    end)
end)

-- Jobs and items: ESX.Jobs / ESX.Items follow ai-core's job definitions and the active inventory.
AddEventHandler('ai-core:definitionsChanged', function(file, name)
    if file ~= 'jobs' then return end
    ESX.Jobs = buildJobs()
    if ESX.Jobs[name] then TriggerEvent('esx:jobRefreshed', name, ESX.Jobs[name])
    else TriggerEvent('esx:jobRemoved', name, 'missing job') end
end)

AddEventHandler('ai-core:inventoryChanged', function()
    ESX.RefreshItems()
end)

CreateThread(function()
    ESX.Jobs = buildJobs()
    ESX.RefreshItems()
end)

-- ESX's server events from ai-core's changes (same names and arguments as ESX).
local loadedCount = 0

Bridge.on('loaded', function(source)
    local x = build(source)
    if not x then return end
    loadedCount = loadedCount + 1
    GlobalState.playerCount = loadedCount
    countJob(x.job.name, 1)
    local license = ESX.GetIdentifier(source)
    if license then byLicense[license], licenseOf[source] = source, license end
    local state = Player(source).state
    state:set('identifier', x.identifier, false)
    state:set('license', x.license, false)
    state:set('job', x.job, true)
    state:set('group', x.group, true)
    state:set('name', x.name, true)
    -- The client half keeps these in PlayerData (ESX sends them with its own playerLoaded payload).
    TriggerClientEvent('esx:setGroup', source, x.group)
    TriggerClientEvent('esx:setMaxWeight', source, x.maxWeight)
    ---@diagnostic disable-next-line: fivem/event-wrong-side -- ESX server scripts listen to it on the server too
    TriggerEvent('esx:playerLoaded', source, x, false)
end)

Bridge.on('unloaded', function(source, reason)
    local x = xPlayers[source]
    if x then x.beginAccountShutdown() end
    if reason == 'dropped' then TriggerEvent('esx:playerDropped', source, reason)
    else
        -- A logout ai-core made itself (its character screen, a switch) is announced as ESX's logout; one a script
        -- asked for was already raised by that script.
        if not logoutAsked[source] then
            raisingLogout = true
            TriggerEvent('esx:playerLogout', source, nil)
            raisingLogout = false
        end
        TriggerEvent('esx:playerDropped', source, 'esx_player_logout')
    end
    logoutAsked[source] = nil
    local license = licenseOf[source]
    if license and byLicense[license] == source then byLicense[license] = nil end
    licenseOf[source] = nil
    if x then
        countJob(x.job.name, -1)
        loadedCount = math.max(0, loadedCount - 1)
        GlobalState.playerCount = loadedCount
    end
    xPlayers[source] = nil
    pendingSet[source] = nil
end)

-- ai-core changed the character's name (SetCharacterInfo).
Bridge.on('character', function(source)
    local x, mirror = xPlayers[source], Bridge.players[source]
    if not x or not mirror then return end
    x.setName(('%s %s'):format(mirror.character.firstname, mirror.character.lastname))
end)

Bridge.on('job', function(source, job)
    local x = xPlayers[source]
    local last = x and x.job or nil
    local next = esxJob(job)
    if x then
        x.job = next
        countJob(last and last.name, -1)
        countJob(next.name, 1)
    end
    Player(source).state:set('job', next, true)
    ---@diagnostic disable-next-line: fivem/event-wrong-side -- ESX server scripts listen to it on the server too
    TriggerEvent('esx:setJob', source, next, last)
end)

Bridge.on('money', function(source, account, balance, delta, reason)
    local mirror = Bridge.players[source]
    local x = xPlayers[source]
    if x and mirror then x.accounts = accountsOf(mirror) end
    local name = esxAccount(account)
    local sets = pendingSet[source]
    if sets and sets[account] and sets[account] >= GetGameTimer() then
        sets[account] = nil
        ---@diagnostic disable-next-line: fivem/event-wrong-side -- ESX server scripts listen to it on the server too
        TriggerEvent('esx:setAccountMoney', source, name, balance, reason)
    elseif delta > 0 then TriggerEvent('esx:addAccountMoney', source, name, delta, reason)
    elseif delta < 0 then TriggerEvent('esx:removeAccountMoney', source, name, -delta, reason) end
end)

BridgeESX = { esxJob = esxJob, esxAccount = esxAccount, getPlayerFromId = getPlayerFromId, savePlayer = savePlayer }
