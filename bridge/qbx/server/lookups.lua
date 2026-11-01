-- Qbox on ai-core, server side: the `exports.qbx_core:*` player, group, money and metadata functions and qbx_core's
-- server events. Player objects are the QB ones (bridge/qb/server/player.lua) with Qbox's extra PlayerData
-- (`userId`, `jobs`, `gangs`, `bankAuth`, Qbox metadata defaults) and player functions added at load; everything
-- reads the shared mirror (bridge/core/server/players.lua) and writes through ai-core.
-- This file: `BridgeQbox.provide` (answers `exports.qbx_core:<name>`) and the indexes of the loaded players.

---@param name string
---@param fn function
function BridgeQbox.provide(name, fn) Bridge.provideExport('qbx_core', name, fn) end

-- Indexes of the loaded players (filled at load, cleared at unload; every lookup is O(1)).

---@type table<string, integer> FiveM identifier ('license:...', 'discord:...') -> source
local byIdentifier = {}
---@type table<integer, string[]> source -> its identifiers (to clear `byIdentifier`)
local identifiersOf = {}
---@type table<integer, integer> account id -> source
local byUserId = {}
---@type table<integer, integer> source -> account id
local userIds = {}
--- The last metadata value each key had (qbx_core's onSetMetaData hands the old value; ai-core's `metaChanged` only the
--- new one).
---@type table<integer, table<string, any>>
local metaBefore = {}

BridgeQbox.byIdentifier = byIdentifier
BridgeQbox.identifiersOf = identifiersOf
BridgeQbox.byUserId = byUserId
BridgeQbox.userIds = userIds
BridgeQbox.metaBefore = metaBefore
