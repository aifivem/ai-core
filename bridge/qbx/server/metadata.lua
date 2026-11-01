-- qbx_core's metadata exports.

local core = Bridge.core
local provide, resolve = BridgeQbox.provide, BridgeQbox.resolve

local CLAMPED = { hunger = true, thirst = true, stress = true }

--- A loaded character's metadata changes through ai-core's player, a stored one's through `SetOfflineMeta`.
provide('SetMetadata', function(identifier, key, value)
    if type(key) ~= 'string' then return end
    local source, offline = resolve(identifier)
    if not source and not offline then return end
    if CLAMPED[key] then
        value = tonumber(value)
        if not value or value ~= value or value == math.huge or value == -math.huge then return end
        value = math.max(0, math.min(100, value))
    end
    local metadata = offline and offline.PlayerData.metadata or Bridge.players[source].metadata
    ---@param k string
    ---@param v any
    local function set(k, v)
        if offline then offline.Functions.SetMetaData(k, v) else core:SetMeta(source, k, v) end
    end
    local top, nested = key:match('^([^%.]+)%.(.+)$')
    if not top then return set(key, value) end
    if nested:find('.', 1, true) then return end
    local current = metadata[top]
    if type(current) ~= 'table' then return end
    local copy = {}
    for k, v in pairs(current) do copy[k] = v end
    copy[nested] = value
    set(top, copy)
end)

provide('GetMetadata', function(identifier, key)
    if type(key) ~= 'string' then return nil end
    local source, offline = resolve(identifier)
    local player = offline or (source and BridgeQB.getPlayer(source))
    if not player then return nil end
    local metadata = player.PlayerData.metadata
    local top, nested = key:match('^([^%.]+)%.(.+)$')
    if not top then return metadata[key] end
    if nested:find('.', 1, true) or type(metadata[top]) ~= 'table' then return nil end
    return metadata[top][nested]
end)
