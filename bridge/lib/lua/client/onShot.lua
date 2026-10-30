-- `IsPedShooting` is true only in the frame of the shot, so it is read every frame, but only while a weapon is held.
---@type fun(weapon: integer)[]
local handlers = {}
local watching = false
local cache = aiLib.cache

local frame = aiLib.every(0, function()
    if cache.weapon and IsPedShooting(cache.ped) then
        for i = 1, #handlers do handlers[i](cache.weapon) end
    end
end, { active = false, name = 'onShot' })

local function start()
    frame:set(#handlers > 0 and cache.weapon and true or false)
end

---Runs `handler(weapon)` in the frame the local ped fires a shot (stress, shot alerts). One per-frame job for the
---resource, running only while a weapon is in hand. Keep the handler cheap.
---@param handler fun(weapon: integer)
return function(handler)
    handlers[#handlers + 1] = handler
    if not watching then
        watching = true
        aiLib.cache.onChange('weapon', start)
    end
    start()
end
