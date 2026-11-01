---Whether it is prime time for `job` (the default hours without one), from ai-core's prime time setting
---(tgiann-policealert's hours while it runs, else ai-core's panel hours).
---@param job? string
---@return boolean
return function(job) return exports['ai-core']:IsPrimeTime(job) end
