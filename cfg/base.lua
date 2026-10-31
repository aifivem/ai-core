-- vRP's cfg/base.lua on ai-core: the values scripts read (`cfg.lang` for vRP's texts, `server_id`, delays). The
-- database settings of vRP are not used: ai-core runs its own pool. Keys from vRP 1.0 and 2
-- (https://github.com/vRP-framework/vRP, MIT).

local cfg = {}

cfg.db = { driver = 'ai-core' }
cfg.server_id = 'main'
cfg.save_interval = 60
cfg.whitelist = false
cfg.load_duration = 30
cfg.load_delay = 0
cfg.global_delay = 0
cfg.ping_timeout = 5
cfg.max_characters = 5
cfg.character_select_delay = 60
cfg.ignore_ip_identifier = true
cfg.lang = 'en'
cfg.debug = false
cfg.debug_async_time = 2
cfg.log_level = 0

return cfg
