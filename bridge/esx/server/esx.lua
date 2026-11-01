-- ESX on ai-core, server side: `exports.es_extended:getSharedObject()`, `esx:getSharedObject`, xPlayer and ESX's
-- server events (es_extended 1.16 public API). This first ESX server file creates `ESX` and `BridgeESX` (the ESX
-- part's namespace); the other files under bridge/esx/server/ add to them. Weapons are inventory items (the loadout is
-- the weapon items of the inventory, ammo / components / tint their metadata).

---@class ESXJob
---@field id integer
---@field name string
---@field label string
---@field grade integer
---@field grade_name string
---@field grade_label string
---@field grade_salary number
---@field skin_male table
---@field skin_female table
---@field onDuty boolean

---@class ESXServer
---@field Math table ESX.Math (bridge/esx/shared/math.lua)
---@field Table table ESX.Table (bridge/esx/shared/table.lua)
---@field OneSync table ESX.OneSync (bridge/esx/server/spawn.lua, area.lua)
---@field Players table<integer, xPlayer>
---@field Jobs table<string, table>
---@field Items table<string, { label: string, weight: number, rare: boolean, canRemove: boolean }>
ESX = { Players = {}, Jobs = {}, Items = {}, OneSync = {} }

BridgeESX = {
    ---@type table<integer, xPlayer> the built xPlayers by source (`ESX.Players`)
    xPlayers = ESX.Players,
    esxJob = BridgeShapes.esxJob,
}

---@type table<string, true>
local warned = {}

---@param key string
---@param text string
local function warnOnce(key, text)
    if warned[key] then return end
    warned[key] = true
    print(('[^3WARNING^7] [ai-core ESX bridge] %s'):format(text))
end
BridgeESX.warnOnce = warnOnce
