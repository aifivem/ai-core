---@class AiLibRadialItem
---@field id string unique id; adding it again replaces the item
---@field label string the text on the card (already translated)
---@field icon? string Font Awesome solid name without `fa-` (`car`), or an image url
---@field parent? string item id this goes into (`'vehicle'`, or another item); nil = the main wheel
---@field items? AiLibRadialItem[] sub items: the card opens a sub menu
---@field canShow? fun(): boolean shown only while this returns true; read each time the wheel opens or refreshes
---@field onPressed? fun() runs when the player picks the item
---@field keepOpen? boolean true keeps the wheel open after the press
---@field whileDead? boolean true keeps the item while the player is down

---Items on whichever radial menu runs, through ai-core's radial layer (ai-radialmenu, or another radial's adapter).
---ai-core keeps them across radial restarts and drops them when this resource stops: add once at start.
return {
    ---@param item AiLibRadialItem
    add = function(item) exports['ai-core']:AddRadialItem(item) end,
    ---@param id string
    remove = function(id) exports['ai-core']:RemoveRadialItem(id) end,
    ---Reads every `canShow` of an open wheel again (after what they read changed).
    refresh = function() exports['ai-core']:RefreshRadial() end,
}
