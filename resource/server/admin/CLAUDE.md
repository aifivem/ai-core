# Admin panel host (ai-core server)

ai-core hosts the one admin panel; it never stores or saves another script's data. How a script adds its panel: `.claude/rules/admin-panel.md` in the server repo.

## Decisions

- Every script's `AdminPanel` (lib) registers with the `RegisterAdminPanel` export at start and answers `AdminPanelSnapshot` / `AdminPanelApply` exports; ai-core asks each started one for its snapshot when an admin opens the panel and forwards each edit to the script that owns the file. Exports stay synchronous (validation and the in-memory write are synchronous; the file write is debounced in the script).
- Admin check on every call: ACE `ai.admin` (`permission.cfg`: `add_ace group.admin ai.admin allow`); 30 writes per 10 s per admin; successful edits are logged on ai-core's `admin` log channel.
- Admins with the panel open get every change as a delta (`ai-core:admin:delta`), whoever made it; the panel applies its own edits at once and puts the old value back with the error when the script refuses.
- The panel opens with F10 (keybind `aicore_admin`, its default set in the Keybinds tab) or `/aiadmin` (server `addCommand`, admins only, sends `ai-core:admin:show`), only while a character is loaded; F10 does nothing for non-admins, `/aiadmin` answers them "not allowed".
- Commands tab: the `commands` file is `memory: true` (never saved), one row per command keyed by its name: lib `addCommand` commands as their resources announce them (`commands.ts`, dropped on resource stop) and every other `GetRegisteredCommands()` entry with a resource as plain ("Not declared" permission), re-read when the panel opens and 1 s after resources start or stop. Shown as a read-only `table` tab.
- Keybinds tab: `data/keybinds.json` (`sync: "all"`, key = keybind name) holds each keybind's script, description, default and device plus the owner's `key`. Keybinds exist only on clients: the admin's client sends the ones it knows with the open callback and new or changed ones are committed (the owner's key is kept). A key is checked against the device's key names (`keybinds.ts`).
- Principals in an `addCommand` `restricted` list (`group.admin`) get `command.<name>` through `add_ace` (taken back with `remove_ace` when the resource stops); without `command.add_ace` / `command.remove_ace` for `resource.ai-core` in `permission.cfg` ai-core warns once and such commands work only for players with `command.<name>`.
- ai-core's own content (settings, spawn points, job rules, jobs, gangs, accounts) is one more panel (`schema.ts`); jobs and gangs created there get their shared accounts and duty count at once (`server/index.ts`).

## Pitfalls

- Not built for scale yet: opening the panel sends every script's whole data snapshot and the panel holds it all; a records file with 100k entries needs server-side paging and search before such a script uses the panel.

- A deleted job or gang is not removed from characters who hold it; they keep the membership until it is changed.
- The pay account select lists the account types that existed at start; a new account type shows after a restart.
- Keybind records of removed scripts stay in `data/keybinds.json` (nothing prunes them).
- Restarting ai-chat drops the lib's command suggestions on clients until a character loads again (the lib keeps what it sent per player).
