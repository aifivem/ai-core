-- qb-core answers every QBCore.Functions entry as an export too; its `DrawText` export is the prompt (drawtext.lua
-- loads after functions.lua there). Loaded after every other QB client file, so each name is exported.

local F = QBCore.Functions

for name, fn in pairs(F) do
    if type(fn) == 'function' and name ~= 'DrawText' then BridgeClient.provideExport('qb-core', name, fn) end
end
