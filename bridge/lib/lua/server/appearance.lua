---Characters' stored looks through ai-core's appearance layer, whatever clothing script runs (ai-appearance,
---tgiann-clothing). A look is `{ model = hash, data = <the clothing script's data> }`: hand it to the client's
---`aiLib.appearance.apply` unchanged.
---@class AiLibCharacterAppearance
---@field model integer ped model hash
---@field data any the clothing script's own look data

local core = exports['ai-core']
return {
    ---A character's stored look (loaded or not); nil when it has none or no clothing script runs. Waits: call it
    ---from a thread.
    ---@param charId integer
    ---@return AiLibCharacterAppearance?
    get = function(charId)
        local p = promise.new()
        local ok = pcall(core.GetCharacterAppearance, core, charId, function(look) p:resolve(look) end)
        if not ok then return nil end
        return Citizen.Await(p)
    end,
    ---The clothing script that answers, or nil.
    ---@return string?
    provider = function() return core:GetAppearanceSystem() end,
}
