# Changelog

## [0.6.1](https://github.com/aifivem/ai-core/compare/v0.6.0...v0.6.1) (2026-11-04)


### Bug Fixes

* **characters:** carry an admin's sex change onto the loaded character ([0f54fdc](https://github.com/aifivem/ai-core/commit/0f54fdc4e68858e4e55588b5629235427da02d8b))
* **phone:** count only an app opening as a 17mov_Phone use, not its closing ([04e411e](https://github.com/aifivem/ai-core/commit/04e411e08c0f67ad4fd6636350dc87a2cdf81a11))

## [0.6.0](https://github.com/aifivem/ai-core/compare/v0.5.3...v0.6.0) (2026-11-02)


### New Features

* **bridge:** answer qbx_smallresources exports and the consumables need events ([e10f945](https://github.com/aifivem/ai-core/commit/e10f9451d0ff05cfbea1666993475b2ae150f6a8))
* **bridge:** answer qbx_smallresources SendWantedAlert and hand it to ai-police ([ba1f0c7](https://github.com/aifivem/ai-core/commit/ba1f0c7ae4363377e0b8357666ff39b14bcaa945))
* **characters:** add illegal status, paycheck office mode, login log and info editing ([9058402](https://github.com/aifivem/ai-core/commit/905840261db7d6aafba95c876fab92cd8d25604f))
* **characters:** let admins change a loaded character's sex as data only ([7f97951](https://github.com/aifivem/ai-core/commit/7f97951387755b9b967c33395e0a3230be84aeb2))
* **mdt:** ask tgiann-mdt, ps-mdt and codem-mdtv2 for active warrants ([370fe1a](https://github.com/aifivem/ai-core/commit/370fe1abf70cef1c07f5607fac64cab8d5e92672))
* **needs:** give health loss its own level, starting when food or water runs out ([fb24e65](https://github.com/aifivem/ai-core/commit/fb24e651afa27dfd94cb348048efa17ae790b7d0))
* **needs:** own hunger and thirst in ai-core with every value in the panel ([76438c1](https://github.com/aifivem/ai-core/commit/76438c170f9bf03db35b6637f11f8c8ad4dbc543))
* **paycheck:** make the paycheck office the default salary mode ([ed5b6c2](https://github.com/aifivem/ai-core/commit/ed5b6c2206482ece93bc1577668141fe9c219caa))
* **paycheck:** run paycheck offices in ai-core and ask where salaries go in the setup guide ([6260d6d](https://github.com/aifivem/ai-core/commit/6260d6dc1077f03764f5908b2bd9e1bd782671d8))
* **phone:** put codem-phone back into the phone layer ([0f8da32](https://github.com/aifivem/ai-core/commit/0f8da3210c7661f5b7d46dcc33afe69d13db00c7))
* **phone:** read every phone's open signal from its event or state bag, no polling ([b948898](https://github.com/aifivem/ai-core/commit/b9488986f929ea434d5781d1bd8812c78b23e7a8))
* **phone:** signal when a player opens the phone, for every supported phone ([f8f23ca](https://github.com/aifivem/ai-core/commit/f8f23ca0562af38c0d9f22b901482b5c309d86df))
* **warrants:** add ai-core's own warrants for when no MDT answers ([2e7bd4d](https://github.com/aifivem/ai-core/commit/2e7bd4d5e573fddf79a238c726f26d929d3b8e7c))


### Bug Fixes

* **phone:** keep codem-phone out of the phone layer, only its phone used signal ([0c41f5c](https://github.com/aifivem/ai-core/commit/0c41f5cbc01416752d66337ff46a558fec306099))


### Documentation

* **phone:** shorten the signal-only phones comment ([b168e9b](https://github.com/aifivem/ai-core/commit/b168e9b894b216f08b946cc48902d135fbeb1392))


### Miscellaneous Chores

* **data:** write the new settings defaults and panel schemas ([497cac6](https://github.com/aifivem/ai-core/commit/497cac63186ab55b368593e2f5e54274b09cc5de))

## [0.5.3](https://github.com/aifivem/ai-core/compare/v0.5.2...v0.5.3) (2026-11-02)


### Bug Fixes

* **setup:** new servers start on the setup guide again ([3129f58](https://github.com/aifivem/ai-core/commit/3129f58256dbc8e147e0210d98e374cbb4be62b2))

## [0.5.2](https://github.com/aifivem/ai-core/compare/v0.5.1...v0.5.2) (2026-11-02)


### Documentation

* install from the release zip ([281a937](https://github.com/aifivem/ai-core/commit/281a9372e8ab30e7adebd2041cac1c1468341dab))


### Miscellaneous Chores

* build files are no longer in git, the release zip carries them ([4d6c03a](https://github.com/aifivem/ai-core/commit/4d6c03a664cad2e4be09c1df76d1d5c29e1365f8))

## [0.5.1](https://github.com/aifivem/ai-core/compare/v0.5.0...v0.5.1) (2026-11-02)


### Bug Fixes

* **build:** keep the web build in dist/ so release zips have the admin panel and the build ends in seconds ([ef29bb0](https://github.com/aifivem/ai-core/commit/ef29bb0a5d6a5401a8558ed4918a7b65f837a9a5))


### Code Refactoring

* import the shared packages from [@aifivem](https://github.com/aifivem) ([7e76194](https://github.com/aifivem/ai-core/commit/7e761943d99df593b2a5cd7d1e59cd461509395c))

## [0.5.0](https://github.com/aifivem/ai-core/compare/v0.4.0...v0.5.0) (2026-11-01)


### New Features

* **core:** SearchCharacters and GetAccountHistory exports ([d9b266e](https://github.com/aifivem/ai-core/commit/d9b266e4915b9d2094b7b5134c0c465b37f2ee96))
* **inventory:** CanCarryItems export for a combined carry check ([55f32a9](https://github.com/aifivem/ai-core/commit/55f32a9fd5e5453919a8eeca281a9a173b1924e7))
* **inventory:** client GetItems export and item count events from the active inventory ([ced6d22](https://github.com/aifivem/ai-core/commit/ced6d221dce95a3710962383374dbea1e0dd15f6))
* **jobs:** GetUnemployedJob export with the panel's unemployed job ([8a5e1fe](https://github.com/aifivem/ai-core/commit/8a5e1fe343da933e0d108a9bdda8f71459fbee39))
* **stress:** AddNeed export for hunger and thirst ([2e5445e](https://github.com/aifivem/ai-core/commit/2e5445e3e8d2b339bb5166714875fd5f2de96103))


### Bug Fixes

* **bridge:** follow bucket changes made outside the QB bucket functions ([5b42193](https://github.com/aifivem/ai-core/commit/5b42193c108f277600e0b15edff6ab48e8cc01b0))

## [0.4.0](https://github.com/aifivem/ai-core/compare/v0.3.0...v0.4.0) (2026-11-01)


### New Features

* **admin:** ban management in the admin panel: Bans section, a character's ban history, ban, edit and lift ([6252f52](https://github.com/aifivem/ai-core/commit/6252f52916e494b0c4a1614fb1dc2481d5615c31))
* **bridge:** answer ESX.RegisterPlayerFunctionOverrides and SetPlayerFunctionOverride ([7baedb6](https://github.com/aifivem/ai-core/commit/7baedb6fa6b407a8573ce6482ffb04a585cf9835))
* **bridge:** answer every qbx_core export, event and vehicle property handler ([102270c](https://github.com/aifivem/ai-core/commit/102270cf77d87ad71f2ca6d06cf9233f9e428109))
* **bridge:** answer the rest of ESX Legacy's server, client and shared API ([2cead70](https://github.com/aifivem/ai-core/commit/2cead7072b6c52671517556c43956ac1e16dfc1e))
* **bridge:** answer the rest of qb-core's server and client API ([2d92a49](https://github.com/aifivem/ai-core/commit/2d92a49ea064a63696719c61031a2e8892589f49))
* **bridge:** load the new framework files and share QB job shapes on both sides ([f30a5df](https://github.com/aifivem/ai-core/commit/f30a5df376cede52d18b6fd8b16723880ae4dde5))
* **bridge:** real offline players, character delete, bans, script jobs, multichar login, item metadata and lib helpers in the ESX, QB and Qbox bridge ([05fd97c](https://github.com/aifivem/ai-core/commit/05fd97c962cff5a24ddc7989fc4b769b0bd92c8f))
* **bridge:** ship Qbox include modules, shared vehicle and weapon data and vehicle properties ([062b1ef](https://github.com/aifivem/ai-core/commit/062b1ef05c30183bca3e2d90d49a9b720833f4c1))
* **core:** bans with a connection check and ban exports ([42a75bb](https://github.com/aifivem/ai-core/commit/42a75bbc4e7987df46fe12488360af4dbcafad0d))
* **core:** item metadata, weight limits, client item definitions and client key checks ([f9e9961](https://github.com/aifivem/ai-core/commit/f9e99611037f0004a58ce34c69106bada046be56))
* **core:** offline character reads and writes, character delete, job members, play time, paycheck switch and forced save ([790ff50](https://github.com/aifivem/ai-core/commit/790ff50952e292dc196d2bb8bc0179953092941f))
* **core:** register the new exports, tables and texts ([4a6e078](https://github.com/aifivem/ai-core/commit/4a6e078e64553b14e2433c9c4e184408a9ce84be))
* **core:** script-registered job and gang definitions ([f6e4caa](https://github.com/aifivem/ai-core/commit/f6e4caa9a214118e656cdb7ccd7bb6077bbf9c81))
* **core:** step aside for an external multicharacter script and project ESX / QB character tables for it ([ba88393](https://github.com/aifivem/ai-core/commit/ba88393f9b36afc6a88729301adaece799a353c2))
* **core:** the death event carries who killed the player, how and from where ([b6aaf52](https://github.com/aifivem/ai-core/commit/b6aaf5211af91292b0d4a1e18cea3d04863b92d0))


### Bug Fixes

* **bridge:** collision-free QB client callback keys and no vehicle type or class from one client for everyone ([03d6a04](https://github.com/aifivem/ai-core/commit/03d6a04f69f5b996407901963402a85311a2b91c))
* **core:** framework tables wait for the database tables at start ([e830be5](https://github.com/aifivem/ai-core/commit/e830be5630a9af71e084adc759dda421a45c39c1))
* **core:** offline money writes report a rolled-back batch; unload waits for the player's writes ([0a3b9af](https://github.com/aifivem/ai-core/commit/0a3b9af4945ef618e55a824ebe9af3fc3ea8bac6))
* **core:** refuse ai-core's character screen create, select and delete calls while an external screen runs ([56e55d7](https://github.com/aifivem/ai-core/commit/56e55d79229fdf7c64b32511c6f17abaa26197c3))


### Performance

* **bridge:** read the inventory's item list once per change, not on every core object ([9dc8cd6](https://github.com/aifivem/ai-core/commit/9dc8cd633403a2639eae558e5575c427103a04c0))


### Code Refactoring

* feature folders and concept files for ai-core's TypeScript and Lua bridge; no behaviour change ([83f1a8d](https://github.com/aifivem/ai-core/commit/83f1a8d79ed459139c718210eacfcb8168b8e7a1))

## [0.3.0](https://github.com/aifivem/ai-core/compare/v0.2.0...v0.3.0) (2026-10-31)


### New Features

* **player:** save ped health with the character and set it again at spawn ([488991a](https://github.com/aifivem/ai-core/commit/488991a00b60b59b0c9cb0e4371c3dab432acc33))
* **stress:** RefillNeeds fills hunger and thirst through the active HUD ([e06d94c](https://github.com/aifivem/ai-core/commit/e06d94c86700ac4a63660283aa297fc8066c7fb8))
* **vrp:** present as vRP 1, 2 and 3 (provide vrp, v1 API, v2/v3 extension sandbox, menus on ai-lib, panel permission mapping) ([87cfb76](https://github.com/aifivem/ai-core/commit/87cfb76a732c71d573288fcf685a5ec41c92718f))


### Bug Fixes

* **inventory:** no version warning for ai-inventory after its own releases ([8d03efc](https://github.com/aifivem/ai-core/commit/8d03efc997c6e90af24752b8ca299ed24f23fc4d))

## [0.2.0](https://github.com/aifivem/ai-core/compare/v0.1.0...v0.2.0) (2026-10-31)


### New Features

* adapters for more inventories, clothing, phones, dispatch, death, prison, weather, HUDs, emotes, radials and key scripts ([46599f0](https://github.com/aifivem/ai-core/commit/46599f0805383e44cadc61ef0e83837756649998))
* **banking:** link job and gang accounts to banking scripts through their exports (core and own modes) ([4ed8073](https://github.com/aifivem/ai-core/commit/4ed8073e46feb4e961277c171b5fbc86e0c9f009))
* **billing:** keep built-in bills in the database (ai_core_bills) ([f822b3e](https://github.com/aifivem/ai-core/commit/f822b3e466a563055ac3d7836cfb00e0a6513259))
* layers for fuel, doors, garages, billing, banking, MDT, EMS, seat belt, stress, emotes, clothing menus, shops and notifications; conflict rules for every layer ([8daea1f](https://github.com/aifivem/ai-core/commit/8daea1feb0e1610ee8c174834369c8d6a0bf9bdc))


### Bug Fixes

* fixed NUI layer (notifications on top, police alerts over the HUD) ([a0ac238](https://github.com/aifivem/ai-core/commit/a0ac2383be092a2b4e046f325043227bf784fbea))
* one start and stop listener for every adapter picker; missing exports while clients load are not errors ([479afd4](https://github.com/aifivem/ai-core/commit/479afd423cebddbf314cca20765ed0bf520ae95e))


### Miscellaneous Chores

* rebuild with the current lib ([0d74845](https://github.com/aifivem/ai-core/commit/0d748457a84d31c853437f9742f45a746907d6a6))
