-- The spawn type of a vehicle model, asked from players' clients the same way as the TypeScript lib's `vehicleType`.

local TYPES = { automobile = true, bike = true, boat = true, heli = true, plane = true, submarine = true, trailer = true, train = true }
---Model hash -> spawn type two different players' clients agreed on.
---@type table<integer, string>
local types = {}
---Model hash -> type -> the first player whose client answered it, until a second player confirms one.
---@type table<integer, table<string, integer>>
local votes = {}

---A model name or hash as the signed 32-bit hash `GetHashKey` gives (a hash written unsigned is the same model).
---@param model string|integer
---@return integer
local function modelHash(model)
    local hash = type(model) == 'number' and math.tointeger(model) or GetHashKey(model --[[@as string]])
    hash = (hash or 0) & 0xFFFFFFFF
    if hash >= 0x80000000 then hash = hash - 0x100000000 end
    return hash
end

---The `CreateVehicleServerSetter` type of a model (name or hash) asked from a player's client (ai-core answers); nil
---when no such vehicle exists. An answer serves only that player's spawn until a second player's client gives the
---same one, then it is kept for everyone. Call from a thread.
---@param model string|integer
---@param asker integer
---@return string?, integer hash
return function(model, asker)
    local hash = modelHash(model)
    if types[hash] then return types[hash], hash end
    local answer = aiLib.triggerClientCallback('ai-core:vehicleType', asker, { model }, 10000)
    if type(answer) ~= 'string' or not TYPES[answer] then return nil, hash end
    local seen = votes[hash] or {}
    local first = seen[answer]
    if first and first ~= asker then
        types[hash], votes[hash] = answer, nil
    else
        seen[answer] = asker
        votes[hash] = seen
    end
    return answer, hash
end
