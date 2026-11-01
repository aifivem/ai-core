-- Routing buckets (qb-core's bookkeeping; the numbers are the script's own).

local playerId = BridgeQB.playerId

--- ai-core's bucket allocator hands out ids from 1000 up: a QB script that picks such a number itself may share it.
local warnedBucket = {}

---@param bucket integer
local function warnBucket(bucket)
    local resource = GetInvokingResource() or '?'
    if bucket < 1000 or warnedBucket[resource] then return end
    warnedBucket[resource] = true
    print(('^3[ai-core bridge] %s puts players or entities in routing bucket %d: ids from 1000 up are handed out by ai-core\'s bucket allocator (exports["ai-core"]:AcquireBucket), so this one may already be in use^0'):format(resource, bucket))
end

---@return table<string, { id: integer, bucket: integer }>, table<integer, { id: integer, bucket: integer }>
function QBCore.Functions.GetBucketObjects()
    return QBCore.Player_Buckets, QBCore.Entity_Buckets
end

---@param source integer
---@param bucket integer
---@return boolean
function QBCore.Functions.SetPlayerBucket(source, bucket)
    local id, number = playerId(source), tonumber(bucket)
    if not id or not number or math.type(number) ~= 'integer' or number < 0 then return false end
    ---@cast number integer
    warnBucket(number)
    Player(id).state:set('instance', number, true)
    SetPlayerRoutingBucket(tostring(id), number)
    local license = Bridge.license(id)
    if license then QBCore.Player_Buckets[license] = { id = id, bucket = number } end
    return true
end

---@param entity integer
---@param bucket integer
---@return boolean
function QBCore.Functions.SetEntityBucket(entity, bucket)
    local number = tonumber(bucket)
    if type(entity) ~= 'number' or not number or math.type(number) ~= 'integer' or number < 0 or not DoesEntityExist(entity) then return false end
    ---@cast number integer
    warnBucket(number)
    SetEntityRoutingBucket(entity, number)
    QBCore.Entity_Buckets[entity] = { id = entity, bucket = number }
    return true
end

---@param bucket integer
---@return integer[]
function QBCore.Functions.GetPlayersInBucket(bucket)
    local out = {}
    for _, entry in pairs(QBCore.Player_Buckets) do
        if entry.bucket == bucket then out[#out + 1] = entry.id end
    end
    return out
end

---@param bucket integer
---@return integer[]
function QBCore.Functions.GetEntitiesInBucket(bucket)
    local out = {}
    for _, entry in pairs(QBCore.Entity_Buckets) do
        if entry.bucket == bucket then out[#out + 1] = entry.id end
    end
    return out
end

AddEventHandler('entityRemoved', function(entity)
    QBCore.Entity_Buckets[entity] = nil
end)

-- A bucket set by any script (the routing bucket natives, tgiann-core, ai-core's allocator) keeps qb-core's
-- bookkeeping and the player's `instance` state right, not only the ones set through these functions.
AddEventHandler('onPlayerBucketChange', function(source, bucket)
    local id, number = tonumber(source), tonumber(bucket)
    if not id or not number then return end
    local license = Bridge.license(id)
    if license then QBCore.Player_Buckets[license] = { id = id, bucket = number } end
    if Player(id).state.instance ~= number then Player(id).state:set('instance', number, true) end
end)

AddEventHandler('onEntityBucketChange', function(entity, bucket)
    local number = tonumber(bucket)
    if type(entity) ~= 'number' or not number then return end
    QBCore.Entity_Buckets[entity] = { id = entity, bucket = number }
end)
