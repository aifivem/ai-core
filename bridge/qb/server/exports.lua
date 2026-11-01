-- qb-core exports every QBCore.Functions function under its name, plus a few of QBCore.Player. Loaded after every
-- other QB server file, so each QBCore.Functions name is exported.

for name, fn in pairs(QBCore.Functions) do
    if type(fn) == 'function' then Bridge.provideExport('qb-core', name, fn) end
end
Bridge.provideExport('qb-core', 'GetOfflinePlayerByLicense', QBCore.Player.GetOfflinePlayerByLicense)
Bridge.provideExport('qb-core', 'ExploitBan', BridgeQB.exploitBan)
