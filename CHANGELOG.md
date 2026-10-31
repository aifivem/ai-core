# Changelog

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
