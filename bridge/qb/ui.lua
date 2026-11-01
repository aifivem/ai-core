-- QBCore on ai-core, client UI and helpers: QBCore.Functions.Progressbar (and the `progressbar` resource), HasItem,
-- the qb-core DrawText prompt, qb-menu and qb-input, drawn by ai-core's progress bar, prompts, menu and input dialog
-- (bridge/core/ui.lua); small QBCore.Functions helpers copied from qb-core (GPL-3.0). Every QBCore.Functions entry is
-- also answered as `exports['qb-core']:<name>`, as qb-core does.

local RESOURCE = GetCurrentResourceName()
local clean = BridgeUI.clean
local F = QBCore.Functions

-- Progress -----------------------------------------------------------------------------------------------------------

---@class QBProgressAction
---@field name? string
---@field duration integer
---@field label string
---@field useWhileDead? boolean
---@field canCancel? boolean
---@field controlDisables? { disableMovement?: boolean, disableCarMovement?: boolean, disableMouse?: boolean, disableCombat?: boolean }
---@field animation? { animDict?: string, anim?: string, flags?: integer, task?: string }

---@param action QBProgressAction
---@param owner string
---@param done fun(cancelled: boolean)
---@return boolean
local function progress(action, owner, done)
    local animation = type(action.animation) == 'table' and action.animation or {}
    return BridgeUI.progress({
        label = action.label or '',
        duration = tonumber(action.duration) or 0,
        owner = owner,
        canCancel = action.canCancel == true,
        whileDead = action.useWhileDead == true,
        disable = type(action.controlDisables) == 'table' and action.controlDisables or nil,
        anim = animation.animDict and { dict = animation.animDict, clip = animation.anim, flag = animation.flags } or nil,
        scenario = animation.task,
        onDone = done,
    })
end

--- qb-core's progress bar (props are not attached).
---@param _name string
---@param label string
---@param duration integer
---@param useWhileDead? boolean
---@param canCancel? boolean
---@param disableControls? table
---@param animation? table
---@param _prop? table
---@param _propTwo? table
---@param onFinish? function
---@param onCancel? function
function F.Progressbar(_name, label, duration, useWhileDead, canCancel, disableControls, animation, _prop, _propTwo, onFinish, onCancel)
    progress({
        label = label,
        duration = duration,
        useWhileDead = useWhileDead,
        canCancel = canCancel,
        controlDisables = disableControls,
        animation = animation,
    }, GetInvokingResource() or RESOURCE, function(cancelled) BridgeUI.call(cancelled and onCancel or onFinish) end)
end

BridgeClient.provideExport('progressbar', 'Progress', function(action, finish)
    if type(action) ~= 'table' then return end
    progress(action, GetInvokingResource() or RESOURCE, function(cancelled) BridgeUI.call(finish, cancelled) end)
end)
BridgeClient.provideExport('progressbar', 'isDoingSomething', function() return BridgeUI.isProgressRunning() end)
RegisterNetEvent('progressbar:client:cancel', function() BridgeUI.cancelProgress() end)

-- Items --------------------------------------------------------------------------------------------------------------

--- `HasItem('bread')`, `HasItem({ 'bread', 'water' }, 2)` (each) or `HasItem({ bread = 2, water = 1 })`.
---@param items string|string[]|table<string, integer>
---@param amount? integer
---@return boolean
function F.HasItem(items, amount)
    local core = exports['ai-core']
    if type(items) == 'string' then return core:HasItem(items, amount or 1) == true end
    if type(items) ~= 'table' then return false end
    for key, value in pairs(items) do
        local name, count = key, value
        if type(key) == 'number' then name, count = value, amount or 1 end
        if not core:HasItem(tostring(name), tonumber(count) or 1) then return false end
    end
    return true
end

-- DrawText prompt (qb-core client/drawtext.lua) -----------------------------------------------------------------------

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

-- qb-menu ------------------------------------------------------------------------------------------------------------

---@class QBMenuItem
---@field header? string
---@field txt? string
---@field icon? string
---@field isMenuHeader? boolean
---@field disabled? boolean
---@field hidden? boolean
---@field params? { event?: string|function, args?: any, isServer?: boolean, isCommand?: boolean, isQBCommand?: boolean, isAction?: boolean }

---@type BridgeDialog|nil
local qbMenu = nil

---@param item QBMenuItem
local function runItem(item)
    local params = type(item.params) == 'table' and item.params or {}
    local event = params.event
    if not event then return end
    if params.isServer then
        TriggerServerEvent(event, params.args)
    elseif params.isCommand then
        ExecuteCommand(event)
    elseif params.isQBCommand then
        TriggerServerEvent('QBCore:CallCommand', event, params.args)
    elseif params.isAction then
        BridgeUI.call(event, params.args)
    else
        TriggerEvent(event, params.args)
    end
end

---@param data QBMenuItem[]
---@param sort? boolean
---@param skipFirst? boolean
local function openMenu(data, sort, skipFirst)
    if type(data) ~= 'table' or not next(data) then return end
    local items = {}
    for _, item in ipairs(data) do
        if type(item) == 'table' and not item.hidden then items[#items + 1] = item end
    end
    if sort then
        local first = skipFirst and table.remove(items, 1) or nil
        table.sort(items, function(a, b) return clean(a.header):upper() < clean(b.header):upper() end)
        if first then table.insert(items, 1, first) end
    end
    ---@type BridgeDialog
    local dialog
    dialog = {
        kind = 'menu',
        owner = GetInvokingResource() or RESOURCE,
        build = function()
            local rows, title = {}, ''
            for i, item in ipairs(items) do
                if item.isMenuHeader and title == '' and i == 1 then
                    title = clean(item.header)
                    if item.txt then rows[#rows + 1] = { id = 'h', label = clean(item.txt), disabled = true } end
                else
                    rows[#rows + 1] = {
                        id = tostring(i),
                        label = clean(item.header),
                        description = item.txt and clean(item.txt) or nil,
                        icon = BridgeUI.icon(item.icon),
                        disabled = (item.disabled or item.isMenuHeader) and true or false,
                    }
                end
            end
            return { title = title, items = rows }
        end,
        answer = function(value)
            if qbMenu == dialog then qbMenu = nil end
            BridgeUI.close(dialog)
            local item = items[tonumber(value) or 0]
            if item then runItem(item) end
        end,
    }
    local last = qbMenu
    qbMenu = dialog
    BridgeUI.open(dialog, last)
end

local function closeMenu()
    local dialog = qbMenu
    qbMenu = nil
    if dialog then BridgeUI.close(dialog) end
end

BridgeClient.provideExport('qb-menu', 'openMenu', openMenu)
BridgeClient.provideExport('qb-menu', 'closeMenu', closeMenu)
-- showHeader shows the menu without focus; ai-core has no unfocused menu, so it is not shown.
BridgeClient.provideExport('qb-menu', 'showHeader', function() end)
RegisterNetEvent('qb-menu:client:openMenu', openMenu)
RegisterNetEvent('qb-menu:client:closeMenu', closeMenu)

-- qb-input -----------------------------------------------------------------------------------------------------------

---@class QBInputField
---@field text? string
---@field name string
---@field type? 'text'|'password'|'number'|'radio'|'select'|'checkbox'|'color'
---@field isRequired? boolean
---@field default? any
---@field options? { value: any, text: string }[]

---@param dialog BridgeDialog
---@return any
local function ask(dialog)
    local p = promise.new()
    local answer = dialog.answer
    dialog.answer = function(value)
        BridgeUI.close(dialog)
        answer(value)
        p:resolve(value)
    end
    BridgeUI.open(dialog)
    return Citizen.Await(p)
end

--- qb-input's ShowInput: text and number fields in one dialog, then one pick list per select / radio field; waits
--- and returns the values by field name, or nil when the player closed it. Checkbox fields are not asked.
---@param data { header?: string, submitText?: string, inputs: QBInputField[] }
---@return table<string, any>|nil
local function showInput(data)
    if type(data) ~= 'table' or type(data.inputs) ~= 'table' then return end
    local owner = GetInvokingResource() or RESOURCE
    local title = clean(data.header)
    local fields, choices = {}, {}
    for _, input in ipairs(data.inputs) do
        if type(input) == 'table' and input.name then
            local kind = input.type or 'text'
            if kind == 'select' or kind == 'radio' then
                choices[#choices + 1] = input
            elseif kind ~= 'checkbox' then
                fields[#fields + 1] = {
                    name = tostring(input.name),
                    label = clean(input.text),
                    type = kind == 'number' and 'number' or 'text',
                    placeholder = input.text and clean(input.text) or nil,
                    value = kind ~= 'number' and input.default ~= nil and tostring(input.default) or nil,
                }
            end
        end
    end
    local result = {}
    if #fields > 0 then
        local values = ask({
            kind = 'input',
            owner = owner,
            build = function()
                return { title = title, confirm = data.submitText and clean(data.submitText) or BridgeUI.text('BRIDGE_CONFIRM'), fields = fields }
            end,
            answer = function() end,
        })
        if type(values) ~= 'table' then return nil end
        for k, v in pairs(values) do result[k] = tostring(v) end
    end
    for _, input in ipairs(choices) do
        local options = type(input.options) == 'table' and input.options or {}
        local picked = ask({
            kind = 'menu',
            owner = owner,
            build = function()
                local items = {}
                for j, option in ipairs(options) do
                    items[j] = { id = tostring(j), label = clean(option.text), icon = option.value == input.default and 'check' or nil }
                end
                return { title = clean(input.text or data.header), items = items }
            end,
            answer = function() end,
        })
        local option = options[tonumber(picked) or 0]
        if not option then return nil end
        result[input.name] = option.value
    end
    return result
end

BridgeClient.provideExport('qb-input', 'ShowInput', showInput)

-- Helpers (qb-core client/functions.lua) -----------------------------------------------------------------------------

---@param coords? vector3|table
local function origin(coords)
    if coords then return vector3(coords.x, coords.y, coords.z) end
    return GetEntityCoords(PlayerPedId())
end

---@param entity integer
---@return vector4
function F.GetCoords(entity)
    local coords = GetEntityCoords(entity)
    return vector4(coords.x, coords.y, coords.z, GetEntityHeading(entity))
end

---@return string
function F.GetName()
    local charinfo = BridgeQBClient.getPlayerData().charinfo or {}
    return ('%s %s'):format(charinfo.firstname or '', charinfo.lastname or '')
end

---@return integer[]
function F.GetVehicles() return GetGamePool('CVehicle') end
---@return integer[]
function F.GetObjects() return GetGamePool('CObject') end
---@return integer[]
function F.GetPlayers() return GetActivePlayers() end

---@param coords? vector3|table
---@param distance? number
---@return integer[]
function F.GetPlayersFromCoords(coords, distance)
    local from, out = origin(coords), {}
    for _, player in ipairs(GetActivePlayers()) do
        if #(GetEntityCoords(GetPlayerPed(player)) - from) <= (distance or 5) then out[#out + 1] = player end
    end
    return out
end

---@param ignoreList? integer[]
---@return integer[]
function F.GetPeds(ignoreList)
    local ignore, out = {}, {}
    for _, ped in ipairs(ignoreList or {}) do ignore[ped] = true end
    for _, ped in ipairs(GetGamePool('CPed')) do
        if not ignore[ped] then out[#out + 1] = ped end
    end
    return out
end

--- The closest ped other than the local one and the peds of `ignoreList`, and the distance; -1, -1 when none.
---@param coords? vector3|table
---@param ignoreList? integer[]
---@return integer, number
function F.GetClosestPed(coords, ignoreList)
    local ignore
    if type(ignoreList) == 'table' and next(ignoreList) then
        ignore = {}
        for _, ped in ipairs(ignoreList) do ignore[ped] = true end
    end
    return BridgeClient.closest('ped', coords, ignore and function(ped) return not ignore[ped] end)
end

---@param coords? vector3|table
---@return integer, number
function F.GetClosestObject(coords) return BridgeClient.closest('object', coords) end

---@param model string|integer
---@param timeout? integer
---@return boolean, integer|string
function F.LoadModel(model, timeout)
    local hash = type(model) == 'number' and model or joaat(model)
    return aiLib.requestModel(hash, timeout or 5000) ~= nil, hash
end

---@param animDict string
---@param timeout? integer
---@return boolean, string
function F.RequestAnimDict(animDict, timeout)
    return aiLib.requestAnimDict(animDict, timeout or 5000) ~= nil, animDict
end

---@param vehicle integer
function F.DeleteVehicle(vehicle)
    SetEntityAsMissionEntity(vehicle, true, true)
    DeleteVehicle(vehicle)
end

---@param vehicle integer
---@return string|nil
function F.GetVehicleLabel(vehicle)
    if not vehicle or vehicle == 0 then return end
    return aiLib.vehicleLabel(vehicle)
end

---@param x number
---@param y number
---@param width number
---@param height number
---@param scale number
---@param r integer
---@param g integer
---@param b integer
---@param a integer
---@param text string
function F.DrawText(x, y, width, height, scale, r, g, b, a, text)
    SetTextFont(4)
    SetTextScale(scale, scale)
    SetTextColour(r, g, b, a)
    BeginTextCommandDisplayText('STRING')
    AddTextComponentSubstringPlayerName(text)
    EndTextCommandDisplayText(x - width / 2, y - height / 2 + 0.005)
end

---@param x number
---@param y number
---@param z number
---@param text string
function F.DrawText3D(x, y, z, text)
    SetTextScale(0.35, 0.35)
    SetTextFont(4)
    SetTextProportional(true)
    SetTextColour(255, 255, 255, 215)
    BeginTextCommandDisplayText('STRING')
    SetTextCentre(true)
    AddTextComponentSubstringPlayerName(text)
    SetDrawOrigin(x, y, z, 0)
    EndTextCommandDisplayText(0.0, 0.0)
    DrawRect(0.0, 0.0125, 0.017 + text:len() / 370, 0.03, 0, 0, 0, 75)
    ClearDrawOrigin()
end

---@param coords vector3|table
---@return { main: string, cross: string }
function F.GetStreetNametAtCoords(coords)
    local location = aiLib.locationName(vector3(coords.x, coords.y, coords.z))
    return { main = location.street, cross = location.crossing or '' }
end

---@param coords vector3
---@return string
function F.GetZoneAtCoords(coords) return aiLib.locationName(vector3(coords.x, coords.y, coords.z)).zone end

---@param entity? integer
---@return string
function F.GetCardinalDirection(entity)
    entity = entity and DoesEntityExist(entity) and entity or PlayerPedId()
    local heading = GetEntityHeading(entity)
    if heading < 45 or heading >= 315 then return 'North' end
    if heading < 135 then return 'West' end
    if heading < 225 then return 'South' end
    return 'East'
end

---@return { min: integer, hour: integer, ampm?: string, formattedHour?: integer, formattedMin?: string }
function F.GetCurrentTime()
    local obj = { min = GetClockMinutes(), hour = GetClockHours() }
    if obj.hour <= 12 then
        obj.ampm = 'AM'
    else
        obj.ampm, obj.formattedHour = 'PM', obj.hour - 12
    end
    if obj.min <= 9 then obj.formattedMin = '0' .. obj.min end
    return obj
end

---@param coords vector3|table
---@return vector3|table|nil
function F.GetGroundZCoord(coords)
    if not coords then return end
    local ground = aiLib.groundZ(coords.x, coords.y, coords.z)
    return ground and vector3(coords.x, coords.y, ground) or coords
end

---@param entity integer
function F.GetGroundHash(entity)
    local coords = GetEntityCoords(entity)
    local test = StartShapeTestCapsule(coords.x, coords.y, coords.z + 4, coords.x, coords.y, coords.z - 2.0, 1, 1, entity, 7)
    local retval, success, endCoords, surfaceNormal, materialHash, entityHit = GetShapeTestResultEx(test)
    return materialHash, entityHit, surfaceNormal, endCoords, success, retval
end

-- qb-core answers every QBCore.Functions entry as an export too; its `DrawText` export is the prompt (drawtext.lua
-- loads after functions.lua there).
for name, fn in pairs(F) do
    if type(fn) == 'function' and name ~= 'DrawText' then BridgeClient.provideExport('qb-core', name, fn) end
end

AddEventHandler('onClientResourceStop', function(resource)
    if qbMenu and qbMenu.owner == resource then qbMenu = nil end
end)
