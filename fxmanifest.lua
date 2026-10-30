name 'ai-core'
author 'ai-core'
version '0.1.0'
license 'GPL-3.0-only'
description 'ai-core framework: players, characters, money, jobs, permissions, admin panel'
fx_version 'cerulean'
game 'gta5'
node_version '22'

client_scripts {
	'dist/client.js',
	'bridge/core/client.lua',
	'bridge/qb/client.lua',
	'bridge/qbx/client.lua',
	'bridge/esx/client.lua',
}
server_scripts {
	'dist/server.js',
	'bridge/core/server.lua',
	'bridge/qb/server.lua',
	'bridge/qbx/server.lua',
	'bridge/esx/server.lua',
}
ui_page 'dist/web/index.html'

dependencies {
	'/onesync',
}

files {
	'locales/*.json',
	'dist/web/*.html',
	'dist/web/assets/*.js',
	'dist/web/assets/*.css',
	'dist/web/assets/*.woff',
	'dist/web/assets/*.woff2',
	'dist/web/backgrounds/*.jpg',
	'modules/playerdata.lua',
	'shared/locale.lua',
	'imports.lua',
	'locale.lua',
}
provide 'es_extended'
provide 'qb-core'
provide 'qbx_core'
