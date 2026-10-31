-- Server-run progress bars (the TypeScript lib's `progressFor`): ai-lib's client draws the bar, the server measures
-- the time itself.
local running = {}

---Runs ai-lib's progress bar on the player's client and waits (call it from a thread): true only when it ran out there
---and at least `minRatio` (0.8) of `duration` passed on the server; false on cancel, timeout or a too-early answer. One
---per player: a second call ends the first with false. Check the flow's conditions again afterwards.
---@param src integer
---@param options { label: string, duration: integer, anim?: { dict: string, clip: string, flag?: integer }, scenario?: string, face?: vector3|table, allowVehicle?: boolean, canCancel?: boolean, freeze?: boolean, disable?: table, minRatio?: number }
---@return boolean
return function(src, options)
    local previous = running[src]
    if previous then
        previous.cancelled = true
        TriggerClientEvent('ai-lib:client:progressForCancel', src)
    end
    local entry = {}
    running[src] = entry
    local bar = {}
    for k, v in pairs(options) do
        if k ~= 'minRatio' then bar[k] = v end
    end
    if type(bar.face) == 'vector3' then bar.face = { x = bar.face.x, y = bar.face.y, z = bar.face.z } end
    local started = GetGameTimer()
    local answer = aiLib.triggerClientCallback('ai-lib:progressFor', src, { bar }, (options.duration or 0) + 15000)
    if running[src] == entry then running[src] = nil end
    if entry.cancelled then return false end
    return answer == true and GetGameTimer() - started >= (options.duration or 0) * (options.minRatio or 0.8)
end
