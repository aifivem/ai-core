-- ESX on ai-core, client side: ESX.Streaming on ai-lib's loaders (a missing asset or a load past the timeout answers
-- nil instead of waiting forever).

ESX.Streaming = {}

---@param asset any
---@param cb? function
local function done(asset, cb)
    if asset ~= nil and cb then cb(asset) end
    return asset
end

---@param modelHash string|integer
---@param cb? function
---@return integer|nil
function ESX.Streaming.RequestModel(modelHash, cb) return done(aiLib.requestModel(modelHash), cb) end

---@param textureDict string
---@param cb? function
function ESX.Streaming.RequestStreamedTextureDict(textureDict, cb) return done(aiLib.requestTextureDict(textureDict), cb) end

---@param assetName string
---@param cb? function
function ESX.Streaming.RequestNamedPtfxAsset(assetName, cb) return done(aiLib.requestPtfxAsset(assetName), cb) end

---@param animSet string
---@param cb? function
function ESX.Streaming.RequestAnimSet(animSet, cb) return done(aiLib.requestAnimSet(animSet), cb) end

---@param animDict string
---@param cb? function
function ESX.Streaming.RequestAnimDict(animDict, cb) return done(aiLib.requestAnimDict(animDict), cb) end

---@param weaponHash string|integer
---@param cb? function
function ESX.Streaming.RequestWeaponAsset(weaponHash, cb) return done(aiLib.requestWeaponAsset(weaponHash), cb) end
