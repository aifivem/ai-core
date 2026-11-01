-- QB metadata and charinfo on ai-core's character metadata: defaults, the QB-only charinfo values, patches.

--- ai-core metadata key for the QB charinfo values ai-core has no column for (bank account number, credit card, the
--- phone number used while no phone script answers); kept out of `PlayerData.metadata`.
local CHARINFO_KEY = 'qbcharinfo'

--- QB's metadata defaults under ai-core's character metadata (the mirror follows ai-core's `metaChanged`).
local META_DEFAULTS = {
    hunger = 100, thirst = 100, stress = 0, isdead = false, inlaststand = false, ishandcuffed = false, armor = 0,
    tracker = false, injail = 0, jailitems = {}, status = {}, phone = {}, rep = {}, callsign = 'NO CALLSIGN',
    jobrep = { tow = 0, trucker = 0, taxi = 0, hotdog = 0 },
    criminalrecord = { hasRecord = false },
    licences = { driver = true, business = false, weapon = false },
    inside = { apartment = {} },
}

---@param value any
---@return any
local function copy(value)
    if type(value) ~= 'table' then return value end
    local out = {}
    for k, v in pairs(value) do out[k] = copy(v) end
    return out
end

---@param mirror { metadata: table<string, any> } a mirror or a stored character
---@return table<string, any>
local function metadataOf(mirror)
    local out = {}
    for key, value in pairs(META_DEFAULTS) do out[key] = copy(value) end
    for key, value in pairs(mirror.metadata) do out[key] = value end
    out[CHARINFO_KEY] = nil
    return out
end

--- QB charinfo values ai-core keeps on the character (names, birth date, nationality, gender) as one
--- `SetCharacterInfo` patch of the ones that differ from `charinfo`; nil when none does. A loaded character's sex is
--- left out (ai-core changes it only while the character is not loaded: the ped model follows it).
---@param value table
---@param charinfo QBCharInfo
---@param loaded boolean
---@return table<string, string>|nil
local function charinfoPatch(value, charinfo, loaded)
    local patch, any = {}, false
    for _, field in ipairs({ 'firstname', 'lastname', 'nationality' }) do
        if type(value[field]) == 'string' and value[field] ~= charinfo[field] then patch[field], any = value[field], true end
    end
    local birthdate = Bridge.isoDate(value.birthdate)
    if birthdate and birthdate ~= charinfo.birthdate then patch.birthdate, any = birthdate, true end
    if not loaded and value.gender ~= nil then
        local sex = Bridge.sexOf(value.gender)
        if sex ~= (charinfo.gender == 1 and 'female' or 'male') then patch.sex, any = sex, true end
    end
    return any and patch or nil
end

--- Applies a charinfo patch to QB's charinfo shape.
---@param charinfo QBCharInfo
---@param patch table<string, string>
local function applyCharinfo(charinfo, patch)
    for key, value in pairs(patch) do
        if key == 'sex' then charinfo.gender = value == 'female' and 1 or 0 else charinfo[key] = value end
    end
end

BridgeQB.copy = copy
BridgeQB.metaDefaults = META_DEFAULTS
BridgeQB.metadataOf = metadataOf
BridgeQB.charinfoKey = CHARINFO_KEY
BridgeQB.charinfoPatch = charinfoPatch
BridgeQB.applyCharinfo = applyCharinfo
