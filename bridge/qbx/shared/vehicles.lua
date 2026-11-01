-- Qbox on ai-core, both sides: qbx_core's vehicle and weapon lists (ai-core's copies).

---@type { hashes: table<integer, table>|nil, categories: table<string, table[]>|nil }
local vehicleIndex = {}

--- `GetVehiclesByName`: one vehicle of qbx_core's list by model name, else the whole list.
---@param key? string
---@return table
function BridgeQbox.vehiclesByName(key)
    local vehicles = BridgeShapes.sharedData('vehicles')
    return key ~= nil and vehicles[key] or vehicles
end

--- `GetVehiclesByHash`: one vehicle by model hash, else the whole hash map (built once).
---@param key? integer
---@return table
function BridgeQbox.vehiclesByHash(key)
    local hashes = vehicleIndex.hashes
    if not hashes then
        hashes = {}
        for _, vehicle in pairs(BridgeShapes.sharedData('vehicles')) do
            if vehicle.hash then hashes[vehicle.hash] = vehicle end
        end
        vehicleIndex.hashes = hashes
    end
    return key ~= nil and hashes[key] or hashes
end

--- `GetVehiclesByCategory`: the vehicles grouped by category (built once).
---@return table<string, table[]>
function BridgeQbox.vehiclesByCategory()
    local categories = vehicleIndex.categories
    if not categories then
        categories = {}
        for _, vehicle in pairs(BridgeShapes.sharedData('vehicles')) do
            local category = vehicle.category
            if category then
                local list = categories[category]
                if not list then list = {} categories[category] = list end
                list[#list + 1] = vehicle
            end
        end
        vehicleIndex.categories = categories
    end
    return categories
end

--- `GetWeapons`: one weapon by hash, else the whole list.
---@param key? integer
---@return table
function BridgeQbox.weapons(key)
    local weapons = BridgeShapes.sharedData('weapons')
    return key ~= nil and weapons[key] or weapons
end
