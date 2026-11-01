-- The qb-core DrawText prompt (client/drawtext.lua) as an ai-lib prompt.

local RESOURCE = GetCurrentResourceName()

---@param text string
---@param _position? string
local function drawText(text, _position) BridgeUI.showText('qb_drawtext', text or '', GetInvokingResource() or RESOURCE) end
local function hideText() BridgeUI.hideText('qb_drawtext') end
local function keyPressed() SetTimeout(500, hideText) end

for name, fn in pairs({ DrawText = drawText, ChangeText = drawText, HideText = hideText, KeyPressed = keyPressed }) do
    BridgeClient.provideExport('qb-core', name, fn)
end
RegisterNetEvent('qb-core:client:DrawText', drawText)
RegisterNetEvent('qb-core:client:ChangeText', drawText)
RegisterNetEvent('qb-core:client:HideText', hideText)
RegisterNetEvent('qb-core:client:KeyPressed', keyPressed)
