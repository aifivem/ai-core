-- vRP 2 / 3 core extensions on ai-core: `coreExtension` (what every core module is made with) and `vRP.EXT.Base`.

local V = BridgeVRP2
local vRP = V.vRP
local coreMixins = V.coreMixins

--- A core module: a plain extension object (`remote` = the vRP client tunnel, whose functions carry vRP 2's names) and
--- its User methods.
---@param name string
---@param ext table
---@param events table|nil
---@param user table|nil User methods (`__construct(user)` runs for every user)
---@return table
local function coreExtension(name, ext, events, user)
    ext.remote = BridgeVRP.client
    ext.log = function(_, msg, level) vRP:log(msg, name, level) end
    ext.error = function(_, msg) vRP:error(msg, name) end
    if user then
        ext.User = user
        coreMixins[#coreMixins + 1] = { methods = user, construct = rawget(user, '__construct') }
    end
    V.addExtension(name, ext, events, nil)
    return ext
end

-- Base: ids to the client (`vRP.EXT.Base.id` / `cid` there).
coreExtension('Base', {}, {
    characterLoad = function(self, user) self.remote._setCharacterId(user.source, user.cid) end,
    playerSpawn = function(self, user, first)
        if first then
            self.remote._setUserId(user.source, user.id)
            self.remote._setCharacterId(user.source, user.cid)
        end
    end,
})

V.coreExtension = coreExtension
