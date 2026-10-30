---A vehicle's display name (`Sultan RS`) from a model name, hash or vehicle entity; the model name when the game has
---no label for it (add-on models without a text entry).
---@param vehicle string|integer model name, model hash or vehicle entity
---@return string
return function(vehicle)
    local model = vehicle
    if type(vehicle) == 'number' and DoesEntityExist(vehicle) and IsEntityAVehicle(vehicle) then model = GetEntityModel(vehicle) end
    local hash = type(model) == 'number' and model or GetHashKey(model)
    local name = GetDisplayNameFromVehicleModel(hash)
    local label = GetLabelText(name)
    if label ~= 'NULL' and label ~= '' then return label end
    if name ~= '' and name ~= 'CARNOTFOUND' then return name end
    return type(model) == 'string' and model or tostring(hash)
end
