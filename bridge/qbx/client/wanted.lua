-- qbx_smallresources' client `SendWantedAlert(place)` (the owner's qbx_smallresources; ai-core provides the name):
-- tgiann-bank, tgiann-clothing, tgiann-realparking, lc_stores call it when a player uses an ATM, a store, a garage.
-- The server side (bridge/qbx/server/smallresources.lua) hands it to ai-police.

local RESOURCE = 'qbx_smallresources'
local EVENT = 'qbx_smallresources:isWanted:sighting'

---@param place string
local function sendWantedAlert(place)
    if type(place) ~= 'string' then return end
    TriggerServerEvent(EVENT, place)
end

BridgeClient.provideExport(RESOURCE, 'SendWantedAlert', sendWantedAlert)
