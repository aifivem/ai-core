import { settings } from "../../content";
import { action, logEdit, onCharacter, parse } from "./gate";
import { changeError, fail, offline, OK } from "./offline";

/** Membership edits of the Players section: jobs, gangs, duty and the active gang. */

/** A job or gang name the definitions know; the unemployed job is never stored. */
const memberArgs = ([charId, name, grade]: unknown[]) => {
  const id = parse.charId(charId);
  const n = parse.name(name);
  const g = parse.int(grade, 0, 255);
  return id === null || n === null || g === null ? null : ([id, n, g] as const);
};
const leaveArgs = ([charId, name]: unknown[]) => {
  const id = parse.charId(charId);
  const n = parse.name(name);
  return id === null || n === null ? null : ([id, n] as const);
};
/** A name, or null for "none" (off duty, no active gang). */
const pickArgs = ([charId, name]: unknown[]) => {
  const id = parse.charId(charId);
  const n = name == null ? null : parse.name(name);
  return id === null || (name != null && n === null)
    ? null
    : ([id, n] as const);
};

action("job", memberArgs, async (source, charId, job, grade) => {
  if (job === settings.jobs.unemployed) return fail("ADMIN_PLAYERS_ERR_JOB");
  const result = await onCharacter(
    charId,
    (player) => {
      const r = player.jobs.set(job, grade);
      return r.ok ? OK : changeError(r.error);
    },
    () => offline.setJob(charId, job, grade),
  );
  if (result.ok) logEdit(source, charId, `set job ${job} ${grade}`);
  return result;
});

action("removeJob", leaveArgs, async (source, charId, job) => {
  const result = await onCharacter(
    charId,
    (player) => {
      const r = player.jobs.remove(job);
      return r.ok ? OK : changeError(r.error);
    },
    () => offline.removeJob(charId, job),
  );
  if (result.ok) logEdit(source, charId, `removed job ${job}`);
  return result;
});

// Duty is runtime state: only for a loaded character.
action("duty", pickArgs, async (source, charId, job) => {
  const result = await onCharacter(
    charId,
    (player) => {
      const r = player.jobs.setDuty(job);
      return r.ok ? OK : changeError(r.error);
    },
    null,
  );
  if (result.ok) logEdit(source, charId, `duty ${job ?? "off"}`);
  return result;
});

action("gang", memberArgs, async (source, charId, gang, grade) => {
  const result = await onCharacter(
    charId,
    (player) => {
      const r = player.gangs.set(gang, grade);
      return r.ok ? OK : changeError(r.error);
    },
    () => offline.setGang(charId, gang, grade),
  );
  if (result.ok) logEdit(source, charId, `set gang ${gang} ${grade}`);
  return result;
});

action("removeGang", leaveArgs, async (source, charId, gang) => {
  const result = await onCharacter(
    charId,
    (player) => {
      const r = player.gangs.remove(gang);
      return r.ok ? OK : changeError(r.error);
    },
    () => offline.removeGang(charId, gang),
  );
  if (result.ok) logEdit(source, charId, `removed gang ${gang}`);
  return result;
});

action("activeGang", pickArgs, async (source, charId, gang) => {
  const result = await onCharacter(
    charId,
    (player) => {
      const r = player.gangs.setActive(gang);
      return r.ok ? OK : changeError(r.error);
    },
    () => offline.setActiveGang(charId, gang),
  );
  if (result.ok) logEdit(source, charId, `active gang ${gang ?? "none"}`);
  return result;
});
