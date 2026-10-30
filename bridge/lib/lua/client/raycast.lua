---A line probe answered in the same frame (`StartExpensiveSynchronousShapeTestLosProbe`), like the TypeScript lib's
---`raycast`: what it hit first, or nil. It blocks until the test is done, so keep it to one or two per frame.
---@param from vector3
---@param to vector3
---@param options? { flags?: integer, ignore?: integer, options?: integer } flags: 1 map, 2 vehicles, 4 peds, 8 ragdolls, 16 objects (default 1 | 2 | 16); ignore: an entity the probe passes through (default the local ped); options: 1 ignore glass, 2 ignore see-through, 4 ignore no-collision (default 7)
---@return { coords: vector3, normal: vector3, entity: integer }?
return function(from, to, options)
    options = options or {}
    local handle = StartExpensiveSynchronousShapeTestLosProbe(from.x, from.y, from.z, to.x, to.y, to.z, options.flags or 19, options.ignore or PlayerPedId(), options.options or 7)
    local _, hit, coords, normal, entity = GetShapeTestResult(handle)
    if hit ~= 1 and hit ~= true then return nil end
    return { coords = coords, normal = normal, entity = entity }
end
