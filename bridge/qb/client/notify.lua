-- QBCore.Debug (client console) and QBCore.Functions.Notify.

--- qb-core prints the table on the server console; here it is printed in the client console (F8).
---@param resource string
---@param obj any
---@param _depth? integer
function QBCore.Debug(resource, obj, _depth)
    print(('^5[%s]^0 %s'):format(resource or GetInvokingResource() or 'qb-core', type(obj) == 'table' and json.encode(obj, { indent = true }) or tostring(obj)))
end

--- `text` may be `{ text, caption }`: `text` is the title over `caption`.
---@param text string|{ text?: string, caption?: string }
---@param kind? string
---@param length? integer
---@param _icon? string
function QBCore.Functions.Notify(text, kind, length, _icon)
    BridgeClient.notify(text, kind, length)
end
