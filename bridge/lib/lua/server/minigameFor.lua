-- Server-run minigames (the TypeScript lib's `minigameFor`); presets match `SKILL_STAGES` / `LOCKPICK_AREAS`.
local SKILL_STAGES = {
    easy = { area = 50, speed = 0.6 },
    medium = { area = 40, speed = 0.85 },
    hard = { area = 25, speed = 1 },
}
local LOCKPICK_AREAS = { easy = 18, medium = 11, hard = 6 }

local function clamp(v, min, max) return math.min(max, math.max(min, math.floor(v))) end

---Plays ai-lib's minigame on the player's client and waits (call it from a thread): 'won', 'lost' (missed, gave up,
---no answer) or 'broken' (the lockpick's last pick broke: take the item). The client's word: the server still decides.
---A win answered sooner than `minMs` after the request counts as lost (the client skipped the game).
---@param src integer
---@param options { game: 'skillCheck'|'lockpick', difficulty?: 'easy'|'medium'|'hard', rounds?: integer, keys?: string[], pins?: integer, picks?: integer, minMs?: integer }
---@return 'won'|'lost'|'broken'
return function(src, options)
    local level = options.difficulty or 'medium'
    local request
    if options.game == 'lockpick' then
        request = {
            kind = 'lockpick',
            pins = clamp(options.pins or 1, 1, 6),
            area = LOCKPICK_AREAS[level] or LOCKPICK_AREAS.medium,
            picks = clamp(options.picks or 1, 1, 10),
        }
    else
        local stages = {}
        for i = 1, clamp(options.rounds or 2, 1, 10) do stages[i] = SKILL_STAGES[level] or SKILL_STAGES.medium end
        request = { kind = 'skillCheck', stages = stages, keys = options.keys or { 'e' } }
    end
    local startedAt = GetGameTimer()
    local answer = aiLib.triggerClientCallback('ai-lib:minigameFor', src, { request }, 120000)
    if answer == true or answer == 'opened' then
        return GetGameTimer() - startedAt < (options.minMs or 0) and 'lost' or 'won'
    end
    return answer == 'broken' and 'broken' or 'lost'
end
