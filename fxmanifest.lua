name 'ai-core'
author 'ai-core'
version '0.1.0'
license 'GPL-3.0-only'
description 'ai-core framework: players, characters, money, jobs, permissions, admin panel'
fx_version 'cerulean'
game 'gta5'
node_version '22'

client_script 'dist/client.js'
server_script 'dist/server.js'
ui_page 'dist/web/index.html'

dependencies {
	'/onesync',
}

files {
	'locales/*.json',
	'dist/web/*.html',
	'dist/web/assets/*.css',
	'dist/web/assets/*.js',
	'dist/web/assets/*.woff',
	'dist/web/assets/*.woff2',
	'dist/web/backgrounds/*.jpg',
}
