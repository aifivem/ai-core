# Changelog

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
