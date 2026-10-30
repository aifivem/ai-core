-- ESX's import for scripts that include '@es_extended/imports.lua' (ai-core provides es_extended, so the include
-- resolves here): the `ESX` global from ai-core's bridge, kept current on the client from the bridge's ESX events.

---@diagnostic disable-next-line: lowercase-global
ESX = exports['es_extended']:getSharedObject()
ESX.currentResourceName = GetCurrentResourceName()

if not IsDuplicityVersion() then
    RegisterNetEvent('esx:playerLoaded', function(xPlayer, _isNew)
        if GetInvokingResource() ~= 'ai-core' then return end
        ESX.PlayerData = xPlayer
        ESX.PlayerLoaded = true
    end)

    RegisterNetEvent('esx:onPlayerLogout', function()
        if GetInvokingResource() ~= 'ai-core' then return end
        ESX.PlayerLoaded = false
        ESX.PlayerData = {}
    end)

    AddEventHandler('esx:setPlayerData', function(key, value)
        if GetInvokingResource() ~= 'ai-core' then return end
        ESX.PlayerData[key] = value
    end)

    RegisterNetEvent('esx:setJob', function(job, _lastJob)
        if GetInvokingResource() ~= 'ai-core' then return end
        ESX.PlayerData.job = job
    end)

    -- ESX.Class and ESX.Point (es_extended's client/imports, GPL-3.0); the distance checks run in ai-core's bridge.
    local base = {}
    base.__index = base

    function base:new(...)
        local instance = setmetatable({}, self)
        if instance.constructor then
            local ret = instance:constructor(...)
            if type(ret) == 'table' then return ret end
        end
        return instance
    end

    ---@param body? table
    ---@param heritage? table
    ---@return table
    function ESX.Class(body, heritage)
        local prototype = body or {}
        prototype.__index = prototype
        return setmetatable(prototype, heritage or base)
    end

    local Point = ESX.Class()
    local nearby, insideLoop = {}, false

    function Point:constructor(properties)
        self.coords = properties.coords
        self.hidden = properties.hidden
        self.enter = properties.enter
        self.leave = properties.leave
        self.inside = properties.inside
        ---@diagnostic disable-next-line: undefined-field -- client side of the shared object
        self.handle = ESX.CreatePointInternal(properties.coords, properties.distance, properties.hidden, function()
            nearby[self.handle] = self
            if self.enter then self:enter() end
            if insideLoop or not self.inside then return end
            insideLoop = true
            CreateThread(function()
                while next(nearby) do
                    local coords = GetEntityCoords(PlayerPedId())
                    for _, point in pairs(nearby) do
                        if point.inside then point:inside(#(coords - point.coords)) end
                    end
                    Wait(0)
                end
                insideLoop = false
            end)
        end, function()
            nearby[self.handle] = nil
            if self.leave then self:leave() end
        end)
    end

    function Point:delete()
        nearby[self.handle] = nil
        ---@diagnostic disable-next-line: undefined-field
        ESX.RemovePointInternal(self.handle)
    end

    function Point:toggle(hidden)
        if hidden == nil then hidden = not self.hidden end
        self.hidden = hidden
        ---@diagnostic disable-next-line: undefined-field
        ESX.HidePointInternal(self.handle, hidden)
    end

    ESX.Point = Point
end
