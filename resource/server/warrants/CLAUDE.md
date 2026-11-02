# Own warrants (ai-core server)

ai-core's own warrant system (owner decision: wanted players and sightings work without an MDT script, like the owner's crew server's isWanted). Exports, lib and event: ai-core `CLAUDE.md` "Contracts"; compat: `docs/compat/mdt.md`.

## Decisions

- Rows of `ai_core_warrants` by character id, loaded or not: `reason` (3-255), `issued_by` (an officer's "Name (citizenid)", `admin <FiveM name> (fivem:id)` from the panel, a script's text or resource name), `expires_at` NULL = until cleared, `cleared_at` / `cleared_by` when cleared. At most `MAX_WARRANTS` (20) active per character: the insert's own condition, so it holds for stored characters too.
- Memory (`store.ts`): a loaded character's active list, read at load and read again after each of its changes (a sequence number per character drops an older answer that arrives later; no patching, so a change during the load read is never lost); expiry is checked on every read. A stored character's answer is one indexed read kept 30 s in the MDT layer's `WarrantCache` (`../mdt/warrants.ts`), forgotten when that citizen's warrants change.
- Who counts: the MDT layer's `hasWarrant` (`../mdt/index.ts`) asks this store by the panel setting `warrants` (MDT card): `auto` = the MDT's warrants while the active MDT has a warrant query, else these; `both`; `mdt`. A new own warrant of an online target is also written into the active MDT as a `warrant` record (when it takes them).
- Expiry: rows are not changed when a warrant runs out; a sweep every minute closes them (`cleared_at = expires_at`, `cleared_by` NULL), so the `active` key holds only live rows and the active list never walks expired ones.
- Order of a change (`changes.ts`): the row, then the store (cache forgotten, a loaded list read again), then `CORE.warrantChangedEvent` once per warrant (the admin card's watchers and the MDT record listen) and a line on channel `warrants`.

## Scale

- Every read is one index range: a character's list `char_active (char_id, cleared_at)`, the check of a stored character the unique `citizenid` key plus `char_active`, the active list `active (cleared_at, id)` newest first with a keyset cursor (25 a page, deleted characters skipped by the join), the sweep `expiry (cleared_at, expires_at)`. Nothing walks every warrant or every character; memory holds at most 20 warrants per loaded character.
