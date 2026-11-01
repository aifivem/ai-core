-- vRP's `prompt` and `request`.

local ui, gui = BridgeVRP.ui, BridgeVRP.gui
local online, settle, newId = gui.online, gui.settle, gui.newId

---@type table<integer, { id: integer, answer: fun(text: string) }>
local prompts = {}
---@type table<integer, { source: integer, answer: fun(ok: boolean) }>
local requests = {}

local PROMPT_MAX = 4000

--- vRP's `prompt`: the text the player typed (`''` on cancel or drop). One prompt per player: a new one answers the
--- open one with `''`.
---@param source any
---@param title any
---@param default any
---@param cb? any `cb(text)`: answer there, nothing waits
---@return string|nil
function ui.prompt(source, title, default, cb)
    return settle(function(answer)
        source = online(source)
        if not source then return answer('') end
        local previous = prompts[source]
        local id = newId()
        prompts[source] = { id = id, answer = answer }
        if previous then previous.answer('') end
        BridgeVRP.client._prompt(source, tostring(title or ''), tostring(default or ''), id)
    end, cb)
end

--- vRP's `request`: true when the player said yes within `seconds` (false on no, timeout or drop).
---@param source any
---@param text any
---@param seconds any
---@param cb? any `cb(ok)`: answer there, nothing waits
---@return boolean|nil
function ui.request(source, text, seconds, cb)
    return settle(function(answer)
        source = online(source)
        if not source then return answer(false) end
        local time = math.max(1, math.min(600, math.floor(tonumber(seconds) or 15)))
        local id = newId()
        requests[id] = { source = source, answer = answer }
        BridgeVRP.client._request(source, id, tostring(text or ''), time)
        SetTimeout(time * 1000, function()
            if requests[id] then
                requests[id] = nil
                answer(false)
            end
        end)
    end, cb)
end

gui.prompts = prompts
gui.requests = requests
gui.promptMax = PROMPT_MAX
