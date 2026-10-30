---A refused action: `{ ok = false, error = key }` with a lang key the client shows (`callAction` there).
---@param error string
---@return { ok: false, error: string }
return function(error)
    return { ok = false, error = error }
end
