-- QB's AddMethod / AddField on Player objects (loaded, offline and detached ones).

---@param value any
---@return boolean
local function isCallable(value)
    if type(value) == 'function' then return true end
    return type(value) == 'table' and type(rawget(value, '__cfx_functionReference')) == 'string'
end

--- QB's AddMethod / AddField on a Player object (fields at its root, methods in `Functions`).
---@param player QBPlayer
---@param functions QBPlayerFunctions
local function addExtensions(player, functions)
    functions.AddMethod = function(name, handler)
        if type(name) ~= 'string' or not isCallable(handler) then return false end
        player[name] = handler
        functions[name] = handler
        return true
    end
    functions.AddField = function(name, value)
        if type(name) ~= 'string' or isCallable(value) or name == 'PlayerData' or name == 'Functions' or name == 'Offline' then return false end
        player[name] = value
        return true
    end
end

BridgeQB.isCallable = isCallable
BridgeQB.addExtensions = addExtensions
