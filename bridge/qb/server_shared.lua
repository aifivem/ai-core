-- QBCore on ai-core, server side: `exports['qb-core']:GetShared` and QBCore's debug printers (the Shared tables are in
-- bridge/qb/shared.lua).

local Shared = QBCore.Shared

--- QB 1.3 `exports['qb-core']:GetShared(namespace, item?)`.
---@param namespace string
---@param item? string|integer
---@return any
local function getShared(namespace, item)
    local data = namespace == 'Jobs' and BridgeQB.sharedJobs()
        or namespace == 'Gangs' and BridgeQB.sharedGangs()
        or namespace == 'Items' and BridgeQB.sharedItems()
        or Shared[namespace]
    if type(data) ~= 'table' then return nil end
    if item ~= nil then return data[item] end
    return data
end
Bridge.provideExport('qb-core', 'GetShared', getShared)

---@param tbl any
---@param indent? integer
local function tPrint(tbl, indent)
    indent = indent or 0
    if type(tbl) ~= 'table' then
        print(('%s ^0%s'):format(string.rep('  ', indent), tostring(tbl)))
        return
    end
    for k, v in pairs(tbl) do
        local formatting = ('%s ^3%s:^0'):format(string.rep('  ', indent), k)
        if type(v) == 'table' then
            print(formatting)
            tPrint(v, indent + 1)
        else
            print(('%s %s'):format(formatting, tostring(v)))
        end
    end
end

---@param tbl any
---@param indent? integer
function QBCore.Debug(tbl, indent)
    print(('^4[ %s : DEBUG]^0'):format(GetInvokingResource() or 'qb-core'))
    tPrint(tbl, indent)
    print('^4[ END DEBUG ]^0')
end

---@param resource string
---@param message string
function QBCore.ShowError(resource, message) print(('^1[%s:ERROR]^0 %s'):format(resource, message)) end

---@param resource string
---@param message string
function QBCore.ShowSuccess(resource, message) print(('^2[%s:LOG]^0 %s'):format(resource, message)) end
