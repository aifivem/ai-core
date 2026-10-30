name 'ai-core'
author 'TGIANN'
version '0.1.0'
license 'GPL-3.0-only'
description 'ai-core framework: players, characters, money, jobs, permissions, admin panel'
repository 'https://github.com/TGIANN/ai-core'
fx_version 'cerulean'
game 'gta5'
node_version '22'

client_scripts {
	'dist/client.js',
	'bridge/core/lib.lua',
	'bridge/lib/init.lua',
	'bridge/core/shapes.lua',
	'bridge/core/client.lua',
	'bridge/core/ui.lua',
	'bridge/qb/client.lua',
	'bridge/qb/ui.lua',
	'bridge/qbx/client.lua',
	'bridge/esx/client.lua',
	'bridge/esx/shared.lua',
	'bridge/esx/game.lua',
	'bridge/esx/ui.lua',
}
server_scripts {
	'dist/server.js',
	'bridge/core/lib.lua',
	'bridge/lib/init.lua',
	'bridge/core/shapes.lua',
	'bridge/core/server.lua',
	'bridge/qb/server.lua',
	'bridge/qbx/server.lua',
	'bridge/esx/server.lua',
	'bridge/esx/shared.lua',
}
ui_page 'dist/web/index.html'

dependencies {
	'/onesync',
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
	'modules/playerdata.lua',
	'bridge/lib/lua/client/*.lua',
	'bridge/lib/lua/shared/*.lua',
	'shared/locale.lua',
	'imports.lua',
	'locale.lua',
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
