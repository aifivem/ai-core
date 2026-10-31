-- vRP 1 client API on ai-core, base: position, players around, animations, sounds (vRP 1.0 `vrp/client/base.lua`;
-- the same `tvRP` names in vRPex, Zirix and vRP 2's `vRP.EXT.Base`). Reachable from the server as
-- `vRPclient.<name>(source, ...)` and from client scripts as `vRP.<name>(...)`. Notifications are bridge/vrp/ui_client.lua.

local tvRP = BridgeVRPClient.tvRP

--- The v1 user_id (character id) of the local player; nil on the character screen.
---@return integer|nil
function tvRP.getUserId()
    local character = BridgeClient.character
    return character and character.id or nil
end

--- The local character's registration (citizenid, as the server's `getUserIdentity`); nil on the character screen.
---@return string|nil
function tvRP.getRegistrationNumber()
    local character = BridgeClient.character
    return character and character.citizenid or nil
end

--- Moves the local ped (vRP passes the ped position, so the feet are not put on `z`).
---@param x any
---@param y any
---@param z any
---@param heading? any vRP 2
function tvRP.teleport(x, y, z, heading)
    x, y, z = tonumber(x), tonumber(y), tonumber(z)
    if not (x and y and z) then return end
    aiLib.player.teleport({ x = x, y = y, z = z }, { ground = false, fade = false, heading = tonumber(heading) })
end

---@return boolean inside a building (an interior)
function tvRP.isInside()
    local coords = GetEntityCoords(aiLib.cache.ped)
    return GetInteriorAtCoords(coords.x, coords.y, coords.z) ~= 0
end

---@return number speed in m/s
function tvRP.getSpeed()
    local v = GetEntityVelocity(aiLib.cache.ped)
    return math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
end

--- The gameplay camera's direction as a unit vector.
---@return number x
---@return number y
---@return number z
function tvRP.getCamDirection()
    local heading = math.rad(GetGameplayCamRelativeHeading() + GetEntityHeading(aiLib.cache.ped))
    local pitch = math.rad(GetGameplayCamRelativePitch())
    local x, y, z = -math.sin(heading), math.cos(heading), math.sin(pitch)
    local len = math.sqrt(x * x + y * y + z * z)
    if len ~= 0 then x, y, z = x / len, y / len, z / len end
    return x, y, z
end

--- Other players within `radius` metres: server id -> distance (streamed players only).
---@param radius any
---@return table<integer, number>
function tvRP.getNearestPlayers(radius)
    radius = tonumber(radius) or 0
    local out = {}
    local origin = GetEntityCoords(aiLib.cache.ped)
    local me = aiLib.cache.playerId
    for _, player in ipairs(GetActivePlayers()) do
        if player ~= me then
            local distance = #(GetEntityCoords(GetPlayerPed(player)) - origin)
            if distance <= radius then out[GetPlayerServerId(player)] = distance end
        end
    end
    return out
end

--- The closest other player within `radius` metres as a server id, nil when none.
---@param radius any
---@return integer|nil
function tvRP.getNearestPlayer(radius)
    return aiLib.nearestPlayer(tonumber(radius) or 0)
end

-- Animations (vRP's sequence player) ----------------------------------------------------------------------------------

---@type table<integer, true>
local running = {}
local nextAnim = 0

--- Stops every sequence; `upper` clears only the upper body task.
---@param upper any
function tvRP.stopAnim(upper)
    running = {}
    if upper then ClearPedSecondaryTask(aiLib.cache.ped) else ClearPedTasks(aiLib.cache.ped) end
end

--- Plays vRP's animation sequence: `seq` = list of `{ dict, name, loops }` or `{ task = scenario, play_exit }`;
--- `upper` = upper body only, `looping` loops each animation.
---@param upper any
---@param seq any
---@param looping any
function tvRP.playAnim(upper, seq, looping)
    if type(seq) ~= 'table' then return end
    if seq.task then
        tvRP.stopAnim(true)
        local ped = aiLib.cache.ped
        if seq.task == 'PROP_HUMAN_SEAT_CHAIR_MP_PLAYER' then
            local coords = GetEntityCoords(ped)
            TaskStartScenarioAtPosition(ped, seq.task, coords.x, coords.y, coords.z - 1, GetEntityHeading(ped), 0, false, false)
        else
            TaskStartScenarioInPlace(ped, seq.task, 0, not seq.play_exit)
        end
        return
    end
    tvRP.stopAnim(upper)
    local flags = (upper and 48 or 0) + (looping and 1 or 0)
    nextAnim = nextAnim + 1
    local id = nextAnim
    running[id] = true
    CreateThread(function()
        for k, step in ipairs(seq) do
            local dict, name, loops = step[1], step[2], tonumber(step[3]) or 1
            for i = 1, loops do
                if not running[id] then break end
                if type(dict) == 'string' and type(name) == 'string' and aiLib.requestAnimDict(dict) and running[id] then
                    local ped = aiLib.cache.ped
                    local inSpeed = (k == 1 and i == 1) and 8.0 or 2.0
                    local outSpeed = (k == #seq and i == loops) and -8.0 or 2.0
                    TaskPlayAnim(ped, dict, name, inSpeed, outSpeed, -1, flags, 0, false, false, false)
                    RemoveAnimDict(dict)
                    Wait(0)
                    while running[id] and GetEntityAnimCurrentTime(ped, dict, name) <= 0.95 and IsEntityPlayingAnim(ped, dict, name, 3) do
                        Wait(0)
                    end
                end
            end
        end
        running[id] = nil
    end)
end

-- Sounds ----------------------------------------------------------------------------------------------------------------

---@param dict any
---@param name any
function tvRP.playSound(dict, name)
    if type(dict) ~= 'string' or type(name) ~= 'string' then return end
    PlaySoundFrontend(-1, name, dict, false)
end

---@param dict any
---@param name any
---@param x any
---@param y any
---@param z any
---@param range any
function tvRP.playSpatializedSound(dict, name, x, y, z, range)
    x, y, z = tonumber(x), tonumber(y), tonumber(z)
    if type(dict) ~= 'string' or type(name) ~= 'string' or not (x and y and z) then return end
    PlaySoundFromCoord(-1, name, x, y, z, dict, false, math.floor(tonumber(range) or 10), false)
end
