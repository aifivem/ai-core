-- ESX's import for scripts that include '@es_extended/imports.lua' (ai-core provides es_extended, so the include
-- resolves here): the `ESX` global from ai-core's bridge, kept current on the client from the bridge's ESX events, plus
-- es_extended's import helpers (OnPlayerData, ESX.Class / Class, ESX.Point, ESX.load / loadJson / require). Follows
-- es_extended 1.16.3's imports.lua (GPL-3.0); its require code credits ox_lib (LGPL-3.0).

---@diagnostic disable-next-line: lowercase-global
ESX = exports['es_extended']:getSharedObject()
ESX.currentResourceName = GetCurrentResourceName()

--- es_extended's hook: a script that sets `OnPlayerData = function(key, value, last)` hears every PlayerData change.
---@type fun(key: string, value: any, last: any)|nil
OnPlayerData = function(_key, _value, _last) end

if not IsDuplicityVersion() then
    --- ESX answers `PlayerData.coords` live from the ped instead of storing it.
    local function trackCoords()
        if not ESX.PlayerData then return end
        ESX.PlayerData.coords = nil
        setmetatable(ESX.PlayerData, { __index = function(_, key)
            if key == 'coords' then return GetEntityCoords(ESX.PlayerData.ped or PlayerPedId()) end
        end })
    end

    AddEventHandler('esx:setPlayerData', function(key, value, last)
        if GetInvokingResource() ~= 'ai-core' then return end
        ESX.PlayerData[key] = value
        if OnPlayerData then OnPlayerData(key, value, last) end
    end)

    RegisterNetEvent('esx:playerLoaded', function(xPlayer, _isNew, _skin)
        if GetInvokingResource() ~= 'ai-core' then return end
        ESX.PlayerData = xPlayer
        ESX.PlayerLoaded = true
        trackCoords()
    end)

    trackCoords()

    RegisterNetEvent('esx:onPlayerLogout', function()
        if GetInvokingResource() ~= 'ai-core' then return end
        ESX.PlayerLoaded = false
        ESX.PlayerData = {}
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

    -- es_extended's class import also leaves the global `Class` in the importing script.
    Class = ESX.Class

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

-- ESX.load / loadJson / require (and the global `require`) when ox_lib does not run, as es_extended's import does.
-- Credits: https://github.com/overextended/ox_lib/blob/master/imports/require/shared.lua (LGPL-3.0).
if GetResourceState('ox_lib') == 'missing' then
    local loaded = {}
    local _require = require

    ---@diagnostic disable-next-line: missing-fields, builtin-overwrite
    package = {
        path = './?.lua;./?/init.lua',
        preload = {},
        loaded = setmetatable({}, {
            __index = loaded,
            __newindex = function() end,
            __metatable = false,
        }),
    }

    --- The resource and path of a module name (`@resource/path`, else the resource of the calling file).
    ---@param modName string
    ---@return string, string
    local function getModuleInfo(modName)
        local resource = modName:match('^@(.-)/.+') --[[@as string?]]
        if resource then return resource, modName:sub(#resource + 3) end
        local idx = 4
        while true do
            local info = debug.getinfo(idx, 'S')
            local src = info and info.source
            if not src then return ESX.currentResourceName, modName end
            resource = src:match('^@@([^/]+)/.+')
            if resource and not src:find('^@@es_extended/imports') and not src:find('^@@ai%-core/imports') then
                return resource, modName
            end
            idx = idx + 1
        end
    end

    local tempData = {}

    ---@param name string
    ---@param path string
    ---@return string? filename
    ---@return string? errmsg
    ---@diagnostic disable-next-line: duplicate-set-field
    function package.searchpath(name, path)
        local resource, modName = getModuleInfo(name:gsub('%.', '/'))
        local tried = {}
        for template in path:gmatch('[^;]+') do
            local fileName = template:gsub('^%./', ''):gsub('?', modName:gsub('%.', '/') or modName)
            local file = LoadResourceFile(resource, fileName)
            if file then
                tempData[1] = file
                tempData[2] = resource
                return fileName
            end
            tried[#tried + 1] = ("no file '@%s/%s'"):format(resource, fileName)
        end
        return nil, table.concat(tried, '\n\t')
    end

    ---@param modName string
    ---@param env? table
    ---@return function|nil, string?
    local function loadModule(modName, env)
        local fileName, err = package.searchpath(modName, package.path)
        if fileName then
            local file, resource = tempData[1], tempData[2]
            tempData[1], tempData[2] = nil, nil
            return assert(load(file, ('@@%s/%s'):format(resource, fileName), 't', env or _ENV))
        end
        return nil, err or 'unknown error'
    end

    ---@diagnostic disable-next-line: inject-field
    package.searchers = {
        function(modName)
            local ok, result = pcall(_require, modName)
            if ok then return result end
            return ok, result
        end,
        function(modName)
            if package.preload[modName] ~= nil then return package.preload[modName] end
            return nil, ("no field package.preload['%s']"):format(modName)
        end,
        function(modName) return loadModule(modName) end,
    }

    --- Loads and runs a Lua file of the calling resource (not cached).
    ---@param filePath string
    ---@param env? table
    ---@return unknown
    function ESX.load(filePath, env)
        if type(filePath) ~= 'string' then error(("file path must be a string (received '%s')"):format(filePath), 2) end
        local result, err = loadModule(filePath, env)
        if result then return result() end
        error(("file '%s' not found\n\t%s"):format(filePath, err))
    end

    --- Loads and decodes a json file (`@resource/path` or a path in the calling resource, without `.json`).
    ---@param filePath string
    ---@return table
    function ESX.loadJson(filePath)
        if type(filePath) ~= 'string' then error(("file path must be a string (received '%s')"):format(filePath), 2) end
        local resourceSrc, modPath = getModuleInfo(filePath:gsub('%.', '/'))
        local resourceFile = LoadResourceFile(resourceSrc, ('%s.json'):format(modPath))
        if resourceFile then return json.decode(resourceFile) end
        error(("json file '%s' not found\n\tno file '@%s/%s.json'"):format(filePath, resourceSrc, modPath))
    end

    --- Loads a module once and returns what it returned (`true` when nothing); `@resource.modName` loads from another
    --- resource.
    ---@param modName string
    ---@return unknown
    function ESX.require(modName)
        if type(modName) ~= 'string' then error(("module name must be a string (received '%s')"):format(modName), 3) end
        local module = loaded[modName]
        if module == '__loading' then error(("^1circular-dependency occurred when loading module '%s'^0"):format(modName), 2) end
        if module ~= nil then return module end
        loaded[modName] = '__loading'
        local err = {}
        for i = 1, #package.searchers do
            local result, errMsg = package.searchers[i](modName)
            if result then
                if type(result) == 'function' then result = result() end
                loaded[modName] = result or result == nil
                return loaded[modName]
            end
            err[#err + 1] = errMsg
        end
        error(table.concat(err, '\n\t'))
    end

    ---@diagnostic disable-next-line: builtin-overwrite
    require = ESX.require
end
