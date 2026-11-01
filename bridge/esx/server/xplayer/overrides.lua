-- ESX on ai-core, server side: ESX's xPlayer function overrides (an inventory's item functions).

local xPlayers = BridgeESX.xPlayers

--- ESX's player function overrides (`ESX.RegisterPlayerFunctionOverrides`): index -> { fnName = fun(xPlayer): function }.
---@type table<string, table<string, fun(self: xPlayer): function>>
BridgeESX.functionOverrides = {}
local functionOverrides = BridgeESX.functionOverrides

---@param self table
---@param funcs table<string, fun(self: xPlayer): function>
local function applyOverrides(self, funcs)
    for fnName, fn in pairs(funcs) do
        local ok, result = pcall(fn, self)
        if ok then self[fnName] = result
        else print(('[^3WARNING^7] xPlayer override %s failed: %s'):format(fnName, result)) end
    end
end
BridgeESX.applyOverrides = applyOverrides

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
