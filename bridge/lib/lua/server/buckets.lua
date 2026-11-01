---Routing buckets from ai-core's allocator: no two scripts ever share one; never `base + n` per script.
local core = exports['ai-core']
return {
    ---A free bucket for this resource (no population, strict lockdown); `tag` names it in logs ("property:12").
    ---@param tag string
    ---@return integer
    acquire = function(tag) return core:AcquireBucket(tag) end,
    ---Gives a bucket back once its players are out; every bucket of a stopped resource goes back by itself.
    ---@return boolean
    release = function(id) return core:ReleaseBucket(id) end,
}
