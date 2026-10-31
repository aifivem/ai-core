-- vRP's cfg/client.lua on ai-core (vRP 2 client vRP and scripts read it): vRP's own GUI, voice and coma are
-- ai-core's and ai-lib's, so only the values scripts read stay. Keys from vRP 1.0 and 2
-- (https://github.com/vRP-framework/vRP, MIT).

local cfg = {}

cfg.iplload = false
cfg.default_menu = true
cfg.gui = { anchor_minimap_width = 260, anchor_minimap_left = 60, anchor_minimap_bottom = 213 }
cfg.controls = {
    phone = { up = { 3, 172 }, down = { 3, 173 }, left = { 3, 174 }, right = { 3, 175 }, select = { 3, 176 }, cancel = { 3, 177 }, open = { 3, 27 } },
    request = { yes = { 1, 166 }, no = { 1, 167 } },
    radio = { 1, 246 },
    survival = { leave_coma = { 0, 22 } },
}
cfg.handcuff_disable_menu = true
cfg.coma_threshold = 120
cfg.coma_duration = 10
cfg.coma_min_duration = 1
cfg.coma_max_duration = 30
cfg.coma_disable_menu = true
cfg.coma_effect = 'DeathFailMPIn'
cfg.vrp_voip = false

return cfg
