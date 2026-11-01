# External character screens (multichar)

Scripts, tables, bridge calls and limits: `docs/compat/multichar.md`.

- `registry.ts` and `schema.ts` hold no FiveM code: the panel schema (and the web preview) imports them. A new multichar is one `MULTICHARS` line.
- `screen.ts` is the only place that decides the screen (`externalScreen()`); session, spawn, login and the projection ask it, and `onScreenSwitch` handlers run after the published GlobalKey and the panel row are updated. ai-core itself is the last adapter of the picker, so `auto` always finds one running.
- Loading goes through `player/session.ts` (`loginCharacterFor`, `createCharacterFor`, `logoutCharacter`: the per-player `SourceLock` and the character `claims` of ai-core's own screen); the spawn branch is `player/spawn.ts`. Never a second load path here.
- `projection/`: one serialized chain (`Projection.run`) does every DDL and write, so enabling, disabling and batches never interleave; account changes are collected in sets and flushed in batches of 100 accounts. Only `inspect()`-marked tables are dropped. ai-core's own deletes set `@ai_core_projection` on their pooled connection inside the transaction; anything else that deletes fires the soft-delete triggers.
- The triggers also note each character they really soft-delete in `ai_core_deleted_log`; every flush batch reads its accounts' rows first (`deletes.ts`: one indexed read, delete, then `characterDeleted` per character, which drops the info cache), enabling and disabling read the whole log once. A multichar's delete is always followed by a refresh point of that account (load, create, leave), so no timer reads the log.
- A just-unloaded character is captured from memory in `playerUnloaded` (before its save lands) and used for its rows instead of the database.
- Row shapes follow the bridge (`bridge/core/shapes.lua`: QB job / gang JSON, ESX `grade_name`): change both together.
