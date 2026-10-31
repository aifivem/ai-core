-- ai-core's shared menu and input dialog (the same ones every TypeScript script opens through lib `menu` / `input`).
local resource = GetCurrentResourceName()
local waiting = {}
---@type table<integer, AiLibMenuListeners>
local listening = {}
local nextId = 0

local function answer(owner, id, value)
    if owner ~= resource then return end
    local entry = waiting[id]
    if not entry then return end
    waiting[id] = nil
    listening[id] = nil
    entry:resolve(value)
end
AddEventHandler('ai-lib:client:menuResult', answer)
AddEventHandler('ai-lib:client:inputResult', answer)
AddEventHandler('ai-lib:client:menuHover', function(owner, id, item)
    local l = owner == resource and listening[id]
    if l and l.onHover then l.onHover(item) end
end)
AddEventHandler('ai-lib:client:menuToggle', function(owner, id, item, checked)
    local l = owner == resource and listening[id]
    if l and l.onToggle then l.onToggle(item, checked) end
end)

---@param open fun(id: integer)
---@param listeners? AiLibMenuListeners
---@return any
local function ask(open, listeners)
    nextId = nextId + 1
    local id = nextId
    local p = promise.new()
    waiting[id] = p
    listening[id] = listeners
    open(id)
    return Citizen.Await(p)
end

---@class AiLibMenuItem
---@field id string
---@field label string
---@field icon? string Font Awesome solid name without `fa-`
---@field description? string
---@field disabled? boolean
---@field checked? boolean a switch row: picking it flips it in place and the menu stays open (`onToggle`)

---@class AiLibMenuListeners
---@field onHover? fun(item: string) the item under the pointer or focus
---@field onToggle? fun(item: string, checked: boolean) a switch row was flipped

local menu = {}

---Shows the menu and waits (call from a thread): the picked item id, `'__back'` for a short Escape in a sub menu
---(`back = true`), or nil when the player closed it. `listeners` hears hovers and switch row flips.
---@param request { title: string, items: AiLibMenuItem[], back?: boolean }
---@param listeners? AiLibMenuListeners
---@return string?
function menu.show(request, listeners)
    local picked = ask(function(id) exports['ai-lib']:OpenMenu(id, request) end, listeners)
    return type(picked) == 'string' and picked or nil
end

---Shows the input dialog and waits: the values by field name, or nil when closed. Field types: `number`
---(`min`, `max`), `text` (`maxLength`, `multiline`, `value`, `readOnly`).
---@param request { title: string, confirm: string, fields: table[] }
---@return table<string, string|number>?
function menu.input(request)
    local values = ask(function(id) exports['ai-lib']:OpenInput(id, request) end)
    return type(values) == 'table' and values or nil
end

---Shows ai-core's item picker (admin tools; the list only reaches admins) and waits (call from a thread): the list
---the player took (`{ name, count }[]`, capped by `target`'s weight limit), or nil when closed. The caller's server
---gives the items and checks every one.
---@param request { title: string, target?: integer }
---@return { name: string, count: integer }[]?
function menu.itemPicker(request)
    local list = ask(function(id) exports['ai-core']:OpenItemPicker(id, request) end)
    return type(list) == 'table' and list or nil
end

-- Same presets as `SKILL_STAGES` / `LOCKPICK_AREAS` in @aicore-fivem/shared.
local SKILL_STAGES = {
    easy = { area = 50, speed = 0.6 },
    medium = { area = 40, speed = 0.85 },
    hard = { area = 25, speed = 1 },
}
local LOCKPICK_AREAS = { easy = 18, medium = 11, hard = 6 }

local function stageOf(d)
    if type(d) == 'table' then
        local area = math.min(180, math.max(5, tonumber(d.areaSize) or 50))
        local mult = math.min(5, math.max(0.2, tonumber(d.speedMultiplier) or 1))
        return { area = area, speed = SKILL_STAGES.easy.speed * mult }
    end
    return SKILL_STAGES[d] or SKILL_STAGES.easy
end

---ai-core's skill check and waits (call from a thread): true when every stage was hit, false on a miss, a wrong key
---or Escape. `difficulty` is `'easy' | 'medium' | 'hard'`, ox_lib's `{ areaSize, speedMultiplier }` or a list of them;
---each stage shows one of `keys` (default `{ 'e' }`).
---@param difficulty string|table
---@param keys? string[]
---@return boolean
function menu.skillCheck(difficulty, keys)
    local list = (type(difficulty) == 'table' and difficulty[1] ~= nil) and difficulty or { difficulty }
    local stages = {}
    for i = 1, math.min(#list, 20) do stages[i] = stageOf(list[i]) end
    local keyList = {}
    for _, k in ipairs(keys or {}) do
        if type(k) == 'string' and k:match('^%w$') then keyList[#keyList + 1] = k:lower() end
    end
    if #keyList == 0 then keyList = { 'e' } end
    local ok = ask(function(id)
        exports['ai-lib']:OpenMinigame(id, { kind = 'skillCheck', stages = stages, keys = keyList })
    end)
    return ok == true
end

---ai-core's lockpick and waits (call from a thread): `'opened'`, `'broken'` (the last pick broke: take the item) or
---`'cancelled'`. A / D move the pick, W turns the lock.
---@param options? { difficulty?: 'easy'|'medium'|'hard', pins?: integer, picks?: integer }
---@return 'opened'|'broken'|'cancelled'
function menu.lockpick(options)
    options = options or {}
    local result = ask(function(id)
        exports['ai-lib']:OpenMinigame(id, {
            kind = 'lockpick',
            pins = math.min(6, math.max(1, math.floor(options.pins or 1))),
            area = LOCKPICK_AREAS[options.difficulty or 'medium'] or LOCKPICK_AREAS.medium,
            picks = math.min(10, math.max(1, math.floor(options.picks or 1))),
        })
    end)
    if result == 'opened' or result == 'broken' then return result end
    return 'cancelled'
end

return menu
