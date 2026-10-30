---@param resource string
---@param lang string
---@return table<string, string>
local function readFile(resource, lang)
    local raw = LoadResourceFile(resource, ('locales/%s.json'):format(lang))
    local ok, parsed = pcall(json.decode, raw or '')
    local texts = {}
    if ok and type(parsed) == 'table' then
        for key, value in pairs(parsed) do
            if type(value) == 'string' then texts[key] = value end
        end
    end
    return texts
end

---A resource's lang texts: `locales/en.json` (the complete base) overlaid with `locales/<ai:locale>.json`, with
---`${OTHER_KEY}` references resolved. Returns `t(key, ...)` filling `{0}`, `{1}`...; a missing key returns the key.
---@param resource? string defaults to the calling resource
---@return fun(key: string, ...: string|number): string t
---@return table<string, string> texts the merged table (for a NUI)
return function(resource)
    resource = resource or GetCurrentResourceName()
    local lang = GetConvar('ai:locale', 'en')
    local texts = readFile(resource, 'en')
    if lang ~= 'en' then
        for key, value in pairs(readFile(resource, lang)) do texts[key] = value end
    end
    for key, value in pairs(texts) do
        texts[key] = value:gsub('%${([%w_]+)}', function(other) return texts[other] end)
    end
    local format = aiLib.formatText
    return function(key, ...)
        return format(texts[key] or key, ...)
    end, texts
end
