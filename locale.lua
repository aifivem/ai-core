-- ESX's locale helpers for scripts that include '@es_extended/locale.lua' (ai-core provides es_extended, so the
-- include resolves here). Both locale file styles work: `Locales['en'] = { ... }` and a file returning its table.

---@diagnostic disable: lowercase-global
Locales = Locales or {}

---@param locale string
---@return table|false
local function loadLocale(locale)
    if Locales[locale] ~= nil then return Locales[locale] end
    local file = LoadResourceFile(GetCurrentResourceName(), ('locales/%s.lua'):format(locale))
    local ok, result = false, nil
    if file then ok, result = pcall(function() return assert(load(file))() end) end
    Locales[locale] = (ok and type(result) == 'table') and result or Locales[locale] or false
    return Locales[locale]
end

---@return string
local function currentLocale()
    local config = rawget(_G, 'Config')
    return type(config) == 'table' and config.Locale or GetConvar('esx:locale', 'en')
end

---@param str string
---@return string
function Translate(str, ...)
    if not str then error(('Resource %s: Translate needs a key'):format(GetCurrentResourceName())) end
    local translations = loadLocale(currentLocale()) or loadLocale('en')
    if translations and translations[str] then
        local ok, result = pcall(string.format, translations[str], ...)
        return ok and result or translations[str]
    end
    return ('Translation [%s][%s] does not exist'):format(currentLocale(), str)
end

---@param str string
---@return string
function TranslateCap(str, ...)
    return (Translate(str, ...):gsub('^%l', string.upper))
end

_ = Translate
_U = TranslateCap
