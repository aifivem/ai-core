-- ESX on ai-core, client UI: ESX's notifications (notify, help, floating help, advanced, mission text, item notices) on
-- ai-core's notifications and prompts.

local RESOURCE = GetCurrentResourceName()
local clean = BridgeUI.clean

---@param text string
---@param kind? string
---@param length? integer
---@param title? string
function ESX.ShowNotification(text, kind, length, title)
    BridgeClient.notify(text, kind, length, title)
end

-- Help notifications become ai-core's prompt (scripts call them every frame): hidden once the calls stop.
local help = { text = nil, untilTime = 0 }
---@type AiLibJob
local helpWatch
helpWatch = aiLib.every(100, function()
    if GetGameTimer() < help.untilTime then return end
    help.text = nil
    BridgeUI.hideText('esx_help')
    helpWatch:set(false)
end, { active = false, name = 'esx help' })

---@param msg string
---@param thisFrame? boolean
---@param _beep? boolean
---@param duration? integer
function ESX.ShowHelpNotification(msg, thisFrame, _beep, duration)
    local text = clean(tostring(msg or ''):gsub('~INPUT_[%w_]+~', ''):gsub('%s%s+', ' '))
    help.untilTime = GetGameTimer() + ((thisFrame or not duration or duration < 0) and 250 or duration)
    if help.text ~= text then
        help.text = text
        BridgeUI.showText('esx_help', text, GetInvokingResource() or RESOURCE)
    end
    if not helpWatch.running then helpWatch:set(true) end
end

---@param msg string
---@param coords vector3|table
function ESX.ShowFloatingHelpNotification(msg, coords)
    AddTextEntry('esxFloatingHelpNotification', msg)
    SetFloatingHelpTextWorldPosition(1, coords.x, coords.y, coords.z)
    SetFloatingHelpTextStyle(1, 1, 2, -1, 3, 0)
    BeginTextCommandDisplayHelp('esxFloatingHelpNotification')
    EndTextCommandDisplayHelp(2, false, false, -1)
end

---@param sender string
---@param subject string
---@param msg string
---@param _textureDict? string
---@param _iconType? integer
function ESX.ShowAdvancedNotification(sender, subject, msg, _textureDict, _iconType)
    local text = clean(msg)
    if subject and subject ~= '' then text = ('%s: %s'):format(clean(subject), text) end
    BridgeClient.notify(text, 'info', nil, sender and clean(sender) or nil)
end

---@param msg string
---@param time integer
function ESX.DrawMissionText(msg, time)
    ClearPrints()
    BeginTextCommandPrint('STRING')
    AddTextComponentSubstringPlayerName(msg)
    EndTextCommandPrint(time, true)
end

--- ESX's "+2 Bread" / "-1 Bread" item notice, as an ai-core notification.
---@param add boolean
---@param item string the item's label
---@param count number
function ESX.UI.ShowInventoryItemNotification(add, item, count)
    BridgeClient.notify(('%s%s %s'):format(add and '+' or '-', math.abs(tonumber(count) or 1), clean(item)), add and 'success' or 'error')
end
