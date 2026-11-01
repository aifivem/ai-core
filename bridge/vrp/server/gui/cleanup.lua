-- GUI cleanup: a player who leaves or lets the character go, and a stopped resource's menus and builders.

local RESOURCE = GetCurrentResourceName()
local gui = BridgeVRP.gui
local v2 = BridgeVRP.ui.v2
local stacks, shown, reopen, remove = gui.stacks, gui.shown, gui.reopen, gui.remove
local prompts, requests, builders, v2Owners = gui.prompts, gui.requests, gui.builders, gui.v2Owners

--- A player who leaves or lets the character go: menus closed with their callbacks (vRP closes them on leave),
--- prompt and requests answered empty.
---@param source integer
local function release(source)
    local stack = stacks[source]
    while stack and #stack > 0 do remove(source, #stack) end
    stacks[source], shown[source] = nil, nil
    local prompt = prompts[source]
    prompts[source] = nil
    if prompt then prompt.answer('') end
    for id, request in pairs(requests) do
        if request.source == source then
            requests[id] = nil
            request.answer(false)
        end
    end
end

Bridge.on('unloaded', release)
AddEventHandler('playerDropped', function() release(tonumber(source) --[[@as integer]]) end)

-- A stopped resource takes its menus and builders with it, without calling back into it.
AddEventHandler('onResourceStop', function(resource)
    if resource == RESOURCE then return end
    for source, stack in pairs(stacks) do
        local top = stack[#stack]
        for i = #stack, 1, -1 do
            if stack[i].owner == resource then table.remove(stack, i) end
        end
        if stack[#stack] ~= top then reopen(source) end
    end
    for _, list in pairs(builders) do
        for i = #list, 1, -1 do
            if list[i].owner == resource then table.remove(list, i) end
        end
    end
    for _, list in pairs(v2.builders) do
        for i = #list, 1, -1 do
            if v2Owners[list[i]] == resource then
                v2Owners[list[i]] = nil
                table.remove(list, i)
            end
        end
    end
end)
