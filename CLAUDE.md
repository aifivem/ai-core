# ai-core

The framework resource: accounts (FiveM id), characters and the character screen, money accounts with a ledger, multi-job and multi-gang with duty, paycheck, ACL mirror, persistence, exports and events. Uses the database through `@aicore-fivem/mysql` (own pool; needs its `add_convar_permission` line). Design and reasoning: `docs/research/core-design.md`, `multijob.md`, `data-management.md` in the server repo.

## Decisions

- The account key is the FiveM id (`fivem:` identifier, owner decision); connecting without one is refused in `playerConnecting`. license and discord are stored next to it for bridges.
- The character screen is part of ai-core (owner decision: UI now, not a separate script) and follows `docs/design.md` (TGIANN style, tgiann-multichar sibling): the UI floats with a light vignette over an in-world scene (`characterScene` in settings, default tgiann-multichar's "city" set): each character stands as a local ped in its saved look on the spot of its slot, playing the spot's idle, and the camera glides to the picked one; the player waits hidden under the scene; `branding.background` shows only when the scene cannot be built. "Choose character" title and the picked character's details on the left, server brand and tagline (`branding` in settings) bottom left, a bottom row of round character slots and green-plus free slots, delete + PLAY pill bar bottom right; creating is its own full-screen view (pill form on the right), deleting a TGIANN confirm popup. Card portraits come from an appearance resource (ai-appearance): ai-core emits `characterScreen (src, charIds)` each time the screen loads and shows what arrives on `ai-core:client:characterPortrait (charId, url)` (only `https://nui-img/` urls); a slot without one shows the initials. Scene peds get their look from ai-appearance's client export `ApplyCharacterAppearance(ped, charId)` when `ai-core:client:characterLook (charId)` arrives (default freemode clothes without it); the scene forces its own time and weather with the weather sync paused (`qb-weathersync:client:DisableSync` / `EnableSync`) and clears everything on spawn, resource stop or a failed build. Mechanism and test list: `docs/research/core-design.md` "Character screen scene". Behind the NUI the player waits in a private routing bucket (`50000 + source`, population off, strict lockdown); no spawnmanager.
- Default accounts `cash`, `bank`, `black_money`, `crypto` (owner decision), defined in `data/accounts.json`. Character accounts start with the type's starting amount; job and gang accounts start empty and load once at start, so the society money exports stay synchronous.
- Money is memory-first: a change is checked and applied synchronously, then goes to the money writer (`money/writer.ts`), which sends every account's changes of 50 ms as one transaction (summed `balance = balance + v.d` per account, multi-row ledger insert), in order. Only ai-core writes balances. Stress numbers: `docs/research/stress-test.md`, benches in `bench/` (separate `ai_core_stress` database).
- Jobs: several per character up to `maxJobs` (one when `multiJob` is off, a new job replaces the old), at most one on duty, salary only from the on-duty job. Duty is runtime state, off after joining unless `restoreDuty`; the last duty job is kept in metadata (`lastDutyJob`). The unemployed job is never stored. Gangs follow the same rules with one active gang (saved).
- Memberships are mirrored to ACL principals `ai.job.<name>` and `ai.job.<name>.<grade>` (every grade up to the player's), same for gangs, on `player.<source>`.
- Position and metadata are written by the periodic flush (`saveIntervalMinutes`), on unload, on resource stop and on txAdmin shutdown; money and memberships are written as they change.
- Panel content (`data/settings.json`, `accounts.json`, `jobs.json`, `gangs.json`) is kept by ai-core's own `AdminPanel` (`resource/server/content`) and edited live in the panel; ai-core also hosts the panel for every other script (`resource/server/admin/CLAUDE.md`).
- Dev test commands `aicore_switch`, `aicore_job`, `aicore_duty`, `aicore_money`, `aicore_gang`, `aicore_db [slow]` (database statistics of every resource) are lib `addCommand`s restricted to admins, answer in the server console and exist only until the admin panel covers them.
- ai-core keeps the server's command list and every keybind's default key for the panel (`resource/server/admin/CLAUDE.md`): lib `addCommand` announces commands through the `RegisterCommands` export; lib `Keybind`s announce themselves to ai-core's client, which answers each with its default key (panel `data/keybinds.json`, `sync: "all"`, else the script's key).
- Items go through ai-core (owner decision: one change reaches every script): the inventory layer (`resource/server/inventory/`, `docs/compat/inventory.md`) forwards to the active inventory through one adapter file per inventory, picked by the panel setting `inventory` (`auto` = first running in registry order) and again on inventory start / stop; it keeps usable items and stashes and hands them to every inventory that becomes active. The bridge's item functions use the same layer; ai-inventory must never call it (loop).
- Vehicle keys go through ai-core the same way (owner decision): the key layer (`resource/server/vehicleKeys/`, `docs/compat/vehicle-keys.md`) forwards to the active key system through one adapter file per system (client-API-only systems through `resource/client/vehicleKeys/adapters/`), picked by the panel setting `vehicleKeys`; with none running every key counts as held.
- The ESX/QB/Qbox bridge is part of ai-core (owner decision): it `provide`s `es_extended`, `qb-core` and `qbx_core` and answers their exports, core objects and events from Lua files in `bridge/`, so other scripts use ai-core as their framework (`.claude/rules/lua-bridges.md`, `docs/research/compatibility.md`).
- Every ai-* resource logs through ai-core (`Log` export, lib `aiLog`), like tgiann-core: resources name channels, ai-core sends to the providers its panel turns on (`data/logs.json`: console, Discord, Fivemanage, FiveM Stats; minimum level, ip on/off). Webhook urls and the Fivemanage key are panel-edited too, but in `data/secrets.json` (git-ignored: `discordWebhooks` by `<resource>/<channel>`, `<resource>` or `default`, `fivemanageKey`); env.cfg is not used for them (owner decision). ai-core logs its own events (characters, money, jobs, gangs, client errors) from its local events in `logs/coreEvents.ts`.

## Contracts

- Exports: typed in `@aicore-fivem/shared` `exports.ts` (`AiCoreServerExports`, `AiCoreClientExports`), registered in `resource/server/exports.ts` and `client/playerState.ts`.
- Server local events (`CORE.*` in `@aicore-fivem/shared`): `playerLoaded (src, CharacterInfo)`, `playerUnloaded (src, charId, "dropped" | "switch")`, `moneyChanged (src, account, balance, delta, reason)`, `jobsChanged`, `dutyChanged`, `gangsChanged`, `activeGangChanged`. Client: `client:playerLoaded (AiPlayerData)`, `client:playerUnloaded`.
- Player data channel to the owner's client: snapshot at load, then `(key, value)` deltas; `money` travels as patches of the changed accounts only (`PLAYER_DATA_PATCH_EVENT`). Client side: lib `onPlayerData` / `getPlayerData`, `GetPlayerData` export for late starters.
- GlobalState `ai:duty:<job>`: on-duty count per job; `ai:inventory` / `ai:vehicleKeys`: the active inventory's and key system's resource names (client adapter pick).
- Vehicle key exports `GiveVehicleKeys`, `RemoveVehicleKeys`, `HasVehicleKeys` (source, entity or plate), typed `VehicleKeysServerExports`; server -> client `ai-core:client:vehicleKeys (action, netId, plate)` for client-API-only systems.
- Inventory exports (server `AddItem`, `RemoveItem`, `GetItemCount`, `HasItem`, `CanCarryItem`, `GetItems`, `ClearInventory`, `RegisterStash`, `OpenInventory`, `RegisterUsableItem`, `GetItemDefinition(s)`, bridge-only `UseItem` / `IsUsableItem`; client `OpenInventory`, `HasItem`), typed `InventoryServerExports` / `InventoryClientExports`; local events `inventoryChanged (resource | null)`, `itemUsed (src, name, status | null)`.
- Client exports `ShowPrompt(id, text)` / `HidePrompt(id)` (lib `showPrompt` / `hidePrompt`): the right-side prompt UI, one interaction keybind (`aicore_interact`, mapping `+aicore_interact_<key>`) tells the resource of the prompt on top through `ai-core:client:promptPressed (resource, id)`; a stopped resource's prompts go with it.
- Client exports `Notify(notification)`, `ShowProgress(label, ms)`, `HideProgress()` and server -> client `ai-core:client:notify`: notification cards (top right) and the progress bar (bottom centre) for every resource through lib `notify` / `progress`; the calling resource runs the timer and animation, ai-core only draws.
- Client local event `ai-core:client:cache (key, value)`: ai-core's one 100 ms watcher of ped, vehicle, seat and weapon feeds every resource's lib `cache`.
- Keybinds (`KEYBIND` in `@aicore-fivem/shared`): client local `ai-core:client:keybind (KeybindInfo)` from the lib, answered with `ai-core:client:keybindKey (resource, name, key)`; client export `GetKeybindKey(name)` gives the key a keybind was registered with. Server export `RegisterCommands(resource, CommandInfo[])` (lib `addCommand`).
- Character screen portraits: server local `characterScreen (src, charIds)`, client local `client:characterPortrait (charId, url)`; the client keeps them until a character spawns and sends them with the open payload and as `portrait` messages.
- Callbacks: `ai-core:characters`, `createCharacter`, `selectCharacter`, `deleteCharacter`; server → client `ai-core:client:spawn (SpawnPoint)`, `ai-core:client:openCharacters`.
- NUI contract: `resource/common/nui.ts`; the open message carries `{ screen, texts, portraits, scene }` (lang table from `loadLocaleTexts`; `scene` false = show the background picture); picking a card calls `focus (characterId)`.
- `ai-core:clientError` (client → server): client script errors, logged on channel `clientErrors` (level error) as `[client error] <resource>: ...` with the player.
- Exports `Log(channel, message, { level, source, target, metadata })` and `LogChannels({ [channel]: { dataset, active } })`; types in `@aicore-fivem/shared` `logs.ts`.
- Bridge (`bridge/`, `docs/compat/bridge.md`): the server part mirrors loaded players from ai-core's local events (`bridge/core/server.lua`) and sends the client part one snapshot (`ai-core:bridge:snapshot`) then patches (`ai-core:bridge:patch`: money, job, gang); the client fires QB / ESX client events locally. Provides `es_extended`, `qb-core`, `qbx_core`.
- Tables: `ai_core_users`, `ai_core_characters` (soft delete `deleted_at`), `ai_core_accounts` (`owner_type` character/job/gang, `owner_id` as text), `ai_core_transactions`, `ai_core_character_jobs`, `ai_core_character_gangs`.

## Pitfalls

- `ai_core_accounts.owner_id` is text: compare with `CAST(id AS CHAR) COLLATE utf8mb4_unicode_ci` in joins. Without the cast the unique key is not used; without the COLLATE the cast takes the connection's `utf8mb4_general_ci` and MariaDB refuses the comparison ("Illegal mix of collations").
- `mysql.transaction` answers `false` on rollback without throwing; `Account.change` turns that into an error so the write queue logs it.
- The dev commands answer in the server console (`print`), not in ai-chat (only `addCommand`'s own errors are notifications); the system chat is off (`resources_useSystemChat false`) because ai-chat provides `chat`.

## Entry points

- Framework bridge: shared mirror `bridge/core/server.lua` and `client.lua`, one folder per framework (`bridge/qb`, `bridge/qbx`, `bridge/esx`).

- Connection, character screen callbacks, load/unload/switch: `resource/server/player/session.ts`; card data `player/screen.ts`.
- Loaded player: `player/player.ts` (with `wallet.ts`, `../jobs/jobSet.ts`, `../jobs/gangSet.ts`).
- Money: `money/account.ts` (one account), `money/book.ts` (loading, job/gang accounts).
- Panel content and defaults: `content/index.ts`.
- Saving: `persistence.ts`; paycheck `jobs/paycheck.ts`.
- Logs: dispatch `logs/index.ts`, providers `logs/discord.ts` (rate-limited queue per webhook) and `logs/services.ts` (Fivemanage batches, FiveM Stats, console), settings and webhook lookup `logs/settings.ts`.
- Client: boot `resource/client/index.ts`, screen and spawn `client/characters.ts`, scene and its peds `client/scene.ts`, camera `client/sceneCamera.ts`; scene panel data `server/content/scene.ts`, its panel tab `server/admin/sceneSchema.ts`.
- NUI: `web/src/features/characters/` (store, actions, panel); browser preview `bun run webdev` with `?view=create|delete|error` (`&scene` = transparent, as over the game scene).

<!--
Rules (this comment may stay in the copy):
- Delete a section that would stay empty. No file, function or column lists: what reading the code shows does not go here.
- No dates, phases, TODOs or "changed/removed" notes; current truth in imperative form.
- Past 150 lines, move section-specific parts into a sub-folder CLAUDE.md (resource/client/CLAUDE.md,
  resource/server/CLAUDE.md, web/CLAUDE.md); it loads automatically when a file in that folder is read.
-->
