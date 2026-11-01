-- ESX on ai-core, server side: the xPlayer's metadata methods (added by build.lua), on ai-core's character metadata.

local core = Bridge.core

---@param self table the xPlayer being built
---@param source integer
---@param mirror BridgeMirror
function BridgeESX.xPlayerMeta(self, source, mirror)
    -- Metadata (ai-core's character metadata)
    function self.getMeta(index, subIndex)
        if not index then return mirror.metadata end
        if type(index) ~= 'string' then return error('xPlayer.getMeta ^5index^1 should be ^5string^1!') end
        local value = mirror.metadata[index]
        if value == nil or not subIndex or type(value) ~= 'table' then return value end
        if type(subIndex) == 'string' then return value[subIndex] end
        if type(subIndex) == 'table' then
            local out = {}
            for _, key in ipairs(subIndex) do
                if type(key) == 'string' then out[key] = value[key] end
            end
            return out
        end
        return error('xPlayer.getMeta subIndex should be ^5string^1 or ^5table^1!')
    end
    function self.setMeta(index, value, subValue)
        if type(index) ~= 'string' then return error('xPlayer.setMeta ^5index^1 should be ^5string^1!') end
        if value == nil then return error('xPlayer.setMeta value is missing!') end
        if subValue == nil then
            local kind = type(value)
            if kind ~= 'number' and kind ~= 'string' and kind ~= 'table' then
                return error('xPlayer.setMeta value should be ^5number^1, ^5string^1 or ^5table^1!')
            end
            core:SetMeta(source, index, value)
            return
        end
        if type(value) ~= 'string' then return error('xPlayer.setMeta ^5value^1 should be ^5string^1 as a subIndex!') end
        local current = mirror.metadata[index]
        local copy = {}
        if type(current) == 'table' then for k, v in pairs(current) do copy[k] = v end end
        copy[value] = subValue
        core:SetMeta(source, index, copy)
    end
    function self.clearMeta(index, subValues)
        if type(index) ~= 'string' then return error('xPlayer.clearMeta ^5index^1 should be ^5string^1!') end
        local current = mirror.metadata[index]
        if current == nil then return end
        if not subValues then
            core:SetMeta(source, index, nil)
            return
        end
        if type(current) ~= 'table' then return error(('xPlayer.clearMeta ^5%s^1 is not a table!'):format(index)) end
        local copy = {}
        for k, v in pairs(current) do copy[k] = v end
        if type(subValues) == 'string' then copy[subValues] = nil
        elseif type(subValues) == 'table' then
            for _, key in ipairs(subValues) do
                if type(key) == 'string' then copy[key] = nil end
            end
        else
            return error('xPlayer.clearMeta ^5subValues^1 should be ^5string^1 or ^5table^1!')
        end
        core:SetMeta(source, index, copy)
    end
end
