-- ESX on ai-core, server side: the xPlayer's identity, group, state, position, job and notification methods (added
-- by build.lua).

local core = Bridge.core
local xPlayers, warnOnce = BridgeESX.xPlayers, BridgeESX.warnOnce
local esxJob = BridgeShapes.esxJob

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

---@param self table the xPlayer being built
---@param source integer
---@param mirror BridgeMirror
function BridgeESX.xPlayerIdentity(self, source, mirror)
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

    -- Notifications
    function self.showNotification(text, kind, length) Bridge.notify(source, text, kind, length) end
    function self.showHelpNotification(msg, thisFrame, beep, duration) TriggerClientEvent('esx:showHelpNotification', source, msg, thisFrame, beep, duration) end
    function self.showAdvancedNotification(sender, subject, msg, textureDict, iconType, flash, saveToBrief, hudColorIndex)
        TriggerClientEvent('esx:showAdvancedNotification', source, sender, subject, msg, textureDict, iconType, flash, saveToBrief, hudColorIndex)
    end
end
