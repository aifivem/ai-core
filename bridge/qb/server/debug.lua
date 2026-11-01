-- QBCore's debug printers.

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
