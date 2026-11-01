-- qb-core's command events (client/events.lua; sent by a server script, never by a local emit) and /me texts.

local F = QBCore.Functions

aiLib.onServerEvent('QBCore:Command:TeleportToPlayer', function(coords)
    if type(coords) ~= 'table' and type(coords) ~= 'vector3' then return end
    aiLib.player.teleport(coords, { keepVehicle = true, fade = false })
end)

aiLib.onServerEvent('QBCore:Command:TeleportToCoords', function(x, y, z, h)
    if type(x) ~= 'number' or type(y) ~= 'number' then return end
    aiLib.player.teleport({ x = x, y = y, z = tonumber(z) }, { heading = tonumber(h), keepVehicle = true, fade = false })
end)

aiLib.onServerEvent('QBCore:Command:GoToMarker', function()
    local waypoint = aiLib.waypoint()
    if not waypoint then return end
    aiLib.player.teleport(waypoint, { keepVehicle = true })
end)

aiLib.onServerEvent('QBCore:Command:SpawnVehicle', function(vehName)
    if type(vehName) ~= 'string' then return end
    local ped = aiLib.cache.ped
    local current = GetVehiclePedIsUsing(ped)
    if current ~= 0 then F.DeleteVehicle(current) end
    F.SpawnVehicle(vehName, function(vehicle)
        SetVehicleDirtLevel(vehicle, 0.0)
        TriggerEvent('vehiclekeys:client:SetOwner', F.GetPlate(vehicle))
    end, F.GetCoords(ped), true, true)
end)

aiLib.onServerEvent('QBCore:Command:DeleteVehicle', function()
    local ped = aiLib.cache.ped
    local vehicle = GetVehiclePedIsUsing(ped)
    if vehicle ~= 0 then return F.DeleteVehicle(vehicle) end
    for _, other in ipairs(aiLib.entitiesInArea('vehicle', GetEntityCoords(ped), 5.0)) do F.DeleteVehicle(other) end
end)

---@param coords vector3
---@param text string
local function draw3DText(coords, text)
    local onScreen, x, y = World3dToScreen2d(coords.x, coords.y, coords.z)
    if not onScreen then return end
    local scale = 200 / (GetGameplayCamFov() * #(GetGameplayCamCoord() - coords))
    SetTextScale(1.0, 0.5 * scale)
    SetTextFont(4)
    SetTextColour(255, 255, 255, 255)
    SetTextEdge(2, 0, 0, 0, 150)
    SetTextProportional(true)
    SetTextOutline()
    SetTextCentre(true)
    BeginTextCommandDisplayText('STRING')
    AddTextComponentSubstringPlayerName(text)
    EndTextCommandDisplayText(x, y)
end

--- /me texts on screen: { sender server id, text, until (game timer) }; drawn each frame only while one shows.
---@type { sender: integer, text: string, untilAt: integer }[]
local meTexts = {}
---@type AiLibJob
local meJob
meJob = aiLib.every(0, function()
    local now = GetGameTimer()
    for i = #meTexts, 1, -1 do
        local entry = meTexts[i]
        local ped = aiLib.playerPed(entry.sender)
        if now > entry.untilAt then
            table.remove(meTexts, i)
        elseif ped ~= 0 then
            draw3DText(GetEntityCoords(ped), entry.text)
        end
    end
    if #meTexts == 0 then meJob:set(false) end
end, { active = false, name = 'qb:me' })

aiLib.onServerEvent('QBCore:Command:ShowMe3D', function(senderId, msg)
    if type(senderId) ~= 'number' or type(msg) ~= 'string' then return end
    meTexts[#meTexts + 1] = { sender = senderId, text = msg, untilAt = GetGameTimer() + 5000 }
    meJob:set(true)
end)
