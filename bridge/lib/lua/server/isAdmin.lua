---Whether a player is an ai-core admin (ace `ai.admin`, or the ace given).
---@param src integer
---@param ace? string
---@return boolean
return function(src, ace)
    return src > 0 and IsPlayerAceAllowed(tostring(src), ace or 'ai.admin')
end
