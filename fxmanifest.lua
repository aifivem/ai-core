name 'ai-core'
author 'TGIANN'
version '0.3.0' -- x-release-please-version
license 'GPL-3.0-only'
description 'ai-core framework: players, characters, money, jobs, permissions, admin panel'
repository 'https://github.com/aifivem/ai-core'
fx_version 'cerulean'
game 'gta5'
node_version '22'

client_scripts {
	'dist/client.js',
	'bridge/core/lib.lua',
	'bridge/lib/init.lua',
	'bridge/core/shapes.lua',
	'bridge/core/client.lua',
	'bridge/core/vehicleprops.lua',
	'bridge/core/ui.lua',
	'bridge/qb/client.lua',
	'bridge/qb/shared.lua',
	'bridge/qb/client_shared.lua',
	'bridge/qb/client_functions.lua',
	'bridge/qb/ui.lua',
	'bridge/qbx/shared.lua',
	'bridge/qbx/client.lua',
	'bridge/esx/client.lua',
	'bridge/esx/shared.lua',
	'bridge/esx/game.lua',
	'bridge/esx/ui.lua',
	'bridge/esx/client_events.lua',
	'lib/utils.lua',
	'bridge/vrp/client.lua',
	'bridge/vrp/v1/client_base.lua',
	'bridge/vrp/v1/client_map.lua',
	'bridge/vrp/v1/client_state.lua',
	'bridge/vrp/ui_client.lua',
	'bridge/vrp/v2/shared.lua',
	'bridge/vrp/v2/client.lua',
}
server_scripts {
	'dist/server.js',
	'bridge/core/lib.lua',
	'bridge/lib/init.lua',
	'bridge/core/shapes.lua',
	'bridge/core/server.lua',
	'bridge/qb/server.lua',
	'bridge/qb/shared.lua',
	'bridge/qb/server_shared.lua',
	'bridge/qb/server_functions.lua',
	'bridge/qbx/shared.lua',
	'bridge/qbx/server.lua',
	'bridge/qbx/server_world.lua',
	'bridge/esx/server.lua',
	'bridge/esx/server_vehicles.lua',
	'bridge/esx/shared.lua',
	'lib/utils.lua',
	'bridge/vrp/server.lua',
	'bridge/vrp/v1/base.lua',
	'bridge/vrp/v1/money.lua',
	'bridge/vrp/v1/groups.lua',
	'bridge/vrp/v1/inventory.lua',
	'bridge/vrp/v1/identity.lua',
	'bridge/vrp/v1/map.lua',
	'bridge/vrp/ui.lua',
	'bridge/vrp/v2/shared.lua',
	'bridge/vrp/v2/server.lua',
}
ui_page 'dist/web/index.html'

dependencies {
	'/onesync',
	'/server:38039',
}

files {
	'locales/*.json',
	'dist/web/assets/*.css',
	'dist/web/assets/*.js',
	'dist/web/assets/*.woff',
	'dist/web/assets/*.woff2',
	'dist/web/backgrounds/*.jpg',
	'dist/web/*.html',
	'data/keybinds.json',
	'data/jobs.json',
	'data/gangs.json',
	'modules/*.lua',
	'shared/vehicles.lua',
	'shared/weapons.lua',
	'bridge/esx/weapons.lua',
	'bridge/lib/lua/client/*.lua',
	'bridge/lib/lua/shared/*.lua',
	'shared/locale.lua',
	'imports.lua',
	'locale.lua',
	'lib/*.lua',
	'cfg/*.lua',
	'cfg/lang/*.lua',
	'vRPShared.lua',
	'client/vRP.lua',
}
provide 'es_extended'
provide 'qb-core'
provide 'qbx_core'
provide 'esx_context'
provide 'esx_textui'
provide 'esx_notify'
provide 'esx_progressbar'
provide 'esx_menu_default'
provide 'esx_menu_dialog'
provide 'esx_menu_list'
provide 'qb-menu'
provide 'qb-input'
provide 'progressbar'
provide 'vrp'
