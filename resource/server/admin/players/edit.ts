import {
  toBirthdate,
  toName,
  toNationality,
  toSex,
} from "@aicore-fivem/shared";
import type { MoneyMode } from "common/adminPlayers";
import { settings } from "../../content";
import { action, actorOf, logEdit, onCharacter, parse } from "./gate";
import { changeError, fail, offline, OK } from "./offline";
import { updateInfo } from "./repo";

/** Character data edits of the Players section: info, money, jobs, gangs, metadata. */

const charArg = (v: unknown) => parse.charId(v);
const MAX_AMOUNT = 1_000_000_000_000;

action(
  "info",
  ([charId, raw]) => {
    const id = charArg(charId);
    if (id === null || typeof raw !== "object" || raw === null) return null;
    const input = raw as Record<string, unknown>;
    return [
      id,
      {
        firstname: toName(input.firstname),
        lastname: toName(input.lastname),
        birthdate: toBirthdate(input.birthdate),
        sex: toSex(input.sex),
        nationality: toNationality(input.nationality),
      },
    ] as const;
  },
  async (source, charId, input) => {
    const { firstname, lastname, birthdate, sex, nationality } = input;
    if (!firstname) return fail("CHAR_ERR_FIRSTNAME");
    if (!lastname) return fail("CHAR_ERR_LASTNAME");
    if (!birthdate) return fail("CHAR_ERR_BIRTHDATE");
    if (!sex) return fail("CHAR_ERR_SEX");
    if (!nationality) return fail("CHAR_ERR_NATIONALITY");
    const info = { firstname, lastname, birthdate, sex, nationality };
    const result = await onCharacter(
      charId,
      async (player) => {
        // The ped model follows the sex: only changed while the character is offline.
        if (player.info().sex !== sex)
          return fail("ADMIN_PLAYERS_ERR_SEX_ONLINE");
        await updateInfo(charId, info);
        player.setInfo(info);
        return OK;
      },
      () => offline.info(charId, info),
    );
    if (result.ok) logEdit(source, charId, "changed the character info", info);
    return result;
  },
);

action(
  "money",
  ([charId, account, mode, amount, reason]) => {
    const id = charArg(charId);
    const name = parse.name(account);
    const m: MoneyMode | null =
      mode === "add" || mode === "remove" || mode === "set" ? mode : null;
    const n = parse.int(amount, m === "set" ? 0 : 1, MAX_AMOUNT);
    const why = parse.text(reason, 3, 64);
    return id === null || name === null || m === null || n === null
      ? null
      : ([id, name, m, n, why] as const);
  },
  async (source, charId, account, mode, amount, reason) => {
    if (reason === null) return fail("ADMIN_PLAYERS_ERR_REASON");
    const actor = actorOf(source);
    const result = await onCharacter(
      charId,
      (player) => {
        const r =
          mode === "set"
            ? player.wallet.set(account, amount, reason, actor)
            : player.wallet.change(
                account,
                mode === "add" ? amount : -amount,
                reason,
                actor,
              );
        return r.ok ? OK : changeError(r.error);
      },
      () => offline.money(charId, account, mode, amount, reason, actor),
    );
    if (result.ok)
      logEdit(source, charId, `money ${mode} ${amount} ${account}`, {
        account,
        mode,
        amount,
        reason,
      });
    return result;
  },
);

/** A job or gang name the definitions know; the unemployed job is never stored. */
const memberArgs = ([charId, name, grade]: unknown[]) => {
  const id = charArg(charId);
  const n = parse.name(name);
  const g = parse.int(grade, 0, 255);
  return id === null || n === null || g === null ? null : ([id, n, g] as const);
};
const leaveArgs = ([charId, name]: unknown[]) => {
  const id = charArg(charId);
  const n = parse.name(name);
  return id === null || n === null ? null : ([id, n] as const);
};
/** A name, or null for "none" (off duty, no active gang). */
const pickArgs = ([charId, name]: unknown[]) => {
  const id = charArg(charId);
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

/** Scalar metadata values only (objects stay read-only in the panel); null removes the key. */
action(
  "meta",
  ([charId, key, value]) => {
    const id = charArg(charId);
    const k =
      typeof key === "string" && /^[A-Za-z0-9_.-]{1,48}$/.test(key)
        ? key
        : null;
    const ok =
      value === null ||
      typeof value === "boolean" ||
      (typeof value === "number" && Number.isFinite(value)) ||
      (typeof value === "string" && value.length <= 256);
    return id === null || k === null || !ok ? null : ([id, k, value] as const);
  },
  async (source, charId, key, value) => {
    const result = await onCharacter(
      charId,
      (player) => {
        player.setMeta(key, value);
        return OK;
      },
      () => offline.meta(charId, key, value),
    );
    if (result.ok) logEdit(source, charId, `metadata ${key}`, { key, value });
    return result;
  },
);
