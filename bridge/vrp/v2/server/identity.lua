local V = BridgeVRP2
local vRP = V.vRP
local v1, coreExtension = V.v1, V.coreExtension

-- Identity: the character (`registration` = citizenid, `phone` from ai-core's phone layer); `name` and vRP 3
-- `lastname` both hold the last name.
---@param cid integer
---@param identity any
---@return table|nil
local function identityOf(cid, identity)
    if type(identity) ~= 'table' then return nil end
    local out = {}
    for k, v in pairs(identity) do out[k] = v end
    out.character_id = cid
    out.lastname = out.lastname or out.name
    out.name = out.name or out.lastname
    return out
end

local Identity = coreExtension('Identity', { cfg = {} })

--- A character's identity, loaded or not (a stored one waits: call in a thread).
---@param cid any
---@return table|nil
function Identity:getIdentity(cid)
    cid = tonumber(cid)
    if not cid then return nil end
    local user = vRP.users_by_cid[cid]
    if user and user.identity then return user.identity end
    return identityOf(cid, v1('getUserIdentity', nil, cid))
end

---@param registration any
---@return integer|nil character id (loaded characters)
function Identity:getByRegistration(registration) return v1('getUserByRegistration', nil, registration) end

---@param phone any
---@return integer|nil character id (loaded characters)
function Identity:getByPhone(phone) return v1('getUserByPhone', nil, phone) end

V.identityOf = identityOf
