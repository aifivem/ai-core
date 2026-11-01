# Multi-job and multi-gang

Owner decision: a character can hold several jobs at once (an admin can give one player more than one job). Gangs follow the same logic. There is no generic group system like Qbox's (`player_groups` with types); jobs are jobs and gangs are gangs, each with its own tables and settings.

## Settings (admin panel)

| Setting | Jobs | Gangs |
|---|---|---|
| Multiple allowed | `multiJob` on/off | `multiGang` on/off |
| Maximum per character (when on) | `maxJobs` | `maxGangs` |
| State after joining the server | off duty (default) or restore last duty | last active gang (default) or none |

With multiple off, a character has exactly one job / at most one gang, and giving a new one replaces the old one (classic ESX/QB behaviour). Turning multiple off while characters hold several keeps their current/active one and asks the admin in the panel before dropping the others.

## Jobs

- A character has up to `maxJobs` jobs, each with its own grade. The admin gives and removes jobs from the panel.
- **At most one job on duty at a time.** Going on duty in a job takes the character off duty in the other one.
- **Salary is paid only for the on-duty job**, at that job's grade. Off duty everywhere = no salary; the character keeps all jobs.

## Prime time

Owner decision (ported from the owner's Qbox server): salaries can drop outside a job's prime time (busy hours). Details and the tgiann-policealert part: `docs/compat/prime-time.md`.

- Settings `primeTime` (Job and gang rules tab): `enabled` (salary cut on/off, on by default: owner decision), `offPrimeMultiplier` (0-1), `source` (`auto` / `ai-core` / a script of `primeTime/registry.ts`), default `start` / `finish` hours. Job records: `primeOwn` + `primeStart` / `primeFinish` (own window). Grades: `offPrimePayment` (0 = not set).
- Paycheck with `enabled`, outside the on-duty job's prime time: the grade's `offPrimePayment` when set, else `floor(salary x offPrimeMultiplier)`; the job account (with `fromJobAccount`) pays what the player gets. One prime time answer per job per run.
- `primeTime/` decides: `auto` = the first running script of the registry (one adapter file each, called through `callExport`), else ai-core's hours; a picked script that is stopped = prime all day (full salary, as the original). Hours are server local whole hours; `start > finish` runs past midnight, `start = finish` is all day.
- The active source is written into the settings as `primeTimeActive` (read-only `info` row in the panel; written only when it changes: at start, on a settings change, when a registry script starts or stops).
- Export `IsPrimeTime(job?)` answers the hours whether or not the cut is on (lib `isPrimeTime`).

## Gangs

- A character has up to `maxGangs` gangs, each with its own grade.
- **At most one active gang at a time** (the gang's equivalent of duty): activating one deactivates the other. The active gang is what other players and gang scripts see (blips, territory, gang chat).
- Gangs have no salary. Gang money (shared funds) lives in the accounts table like job money.

## Data

- Definitions (name, label, grades with label, salary for jobs, permissions) are panel content: `data/jobs.json` and `data/gangs.json` in ai-core. The shipped records are qb-core's defaults (`shared/jobs.lua`, `shared/gangs.lua`) in our shape, except `police`, `ambulance`, `mechanic` and `unemployed`, which keep ai-core's own values; QB's `none` gang is not a record (no active gang = none).
- A job's `listed` switch ("Listed in the job center", default off) marks a job anyone may take at a job center: the ESX bridge's `GetJobs()` answers `whitelisted = not listed` (esx_joblisting). ai-cityhall keeps its own offer list in its panel.
- Scripts can add definitions at runtime (`RegisterJobDefinition` / `RegisterGangDefinition`, `runtime.ts`): owned by the registering resource and gone when it stops, never saved to the panel files, a panel record of the same name always wins. Members of a definition that is gone keep the membership (no salary: no grade to pay), like a job deleted in the panel.
- Memberships are player data: `character_jobs` and `character_gangs` tables (`char_id`, `job` | `gang`, `grade`), PRIMARY KEY (`char_id`, `job` | `gang`), index (`job` | `gang`, `char_id`, `grade`) for member lists (`GetJobMembers`, keyset pages: 1.5M memberships, 0.7-0.9 ms per 100-row page at any depth).
- Duty / active gang: one value per character each (job name or none, gang name or none). The active gang is saved with the character; duty is in memory unless the restore setting is on.
- Job and gang money lives in the shared accounts table (owner type `job` / `gang`), with atomic updates and the ledger.

## Bridges

- ESX `xPlayer.job` and QB `PlayerData.job` show the **current job**: the on-duty job, or when off duty the last job the character was on duty in (then the first job, then the unemployed job). `onduty` mirrors the duty state.
- QB `PlayerData.gang` shows the active gang (or "none"). ESX has no gangs.
- Qbox scripts also get the `jobs` and `gangs` maps (all memberships with grades).
- A bridge `setJob` / `SetGang` call from a ready-made script adds or updates that membership and makes it current; it deletes other memberships only when multiple is off.

## Permissions and sync

- Each membership is mirrored to an ACL principal (`ai.job.<name>` / `ai.gang.<name>` with grade inheritance), so non-ai resources can check them with `IsPlayerAceAllowed`. Duty and active gang are checked through core exports (or the bridge fields).
- The character's own memberships, grades, duty and active gang reach only its client, as snapshot + delta.
- Live on-duty counts per job (police online, EMS online) through per-key GlobalState: counts only, never member lists.

## Hooks

Cancellable server hooks for: job/gang added, removed, grade changed, duty on/off, active gang changed, salary paid.

## Reference

- Qbox `server/player.lua` (`AddPlayerToJob`, `SetPlayerPrimaryJob`, `SetJobDuty`, gang equivalents): the bridge surface QB/Qbox scripts expect.
