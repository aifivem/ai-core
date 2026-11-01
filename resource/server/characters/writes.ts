import { caller } from "@aicore-fivem/lib/server";
import type { CharacterResult } from "@aicore-fivem/shared";
import type { MoneyMode } from "common/adminPlayers";
import { changeError, offline } from "../admin/players/offline";
import { settings } from "../content";
import { answer } from "./answer";
import { editCharacter, fail, toCharId } from "./edit";

/**
 * Script writes of a character by id, loaded or not (`AddOfflineMoney`, `SetOfflineJob`...). A loaded character
 * changes through its `Player` exactly like the source-based exports; a stored one through the admin panel's offline
 * mutators (same rules, the money writer and ledger for money) while the character is held.
 */

const INVALID = fail("CORE_ERR_ARGS");
const NAME = /^[A-Za-z0-9_-]{1,48}$/;
const META_KEY = /^[A-Za-z0-9_.:-]{1,64}$/;
const MAX_AMOUNT = 1_000_000_000_000;

const nameOf = (v: unknown): string | null =>
  typeof v === "string" && NAME.test(v) ? v : null;
const gradeOf = (v: unknown): number | null =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 255 ? v : null;

const ERROR: CharacterResult = fail("ADMIN_PLAYERS_ERR_BUSY");

/** `mode` add / remove / set of one account; `reason` defaults to the calling resource (read before any await). */
export function offlineMoney(
  mode: MoneyMode,
  charId: unknown,
  account: unknown,
  amount: unknown,
  reason: unknown,
  done: unknown,
): void {
  const id = toCharId(charId);
  const name = nameOf(account);
  const by = caller();
  const why = typeof reason === "string" && reason ? reason.slice(0, 64) : by;
  const min = mode === "set" ? 0 : 1;
  const n =
    typeof amount === "number" &&
    Number.isSafeInteger(amount) &&
    amount >= min &&
    amount <= MAX_AMOUNT
      ? amount
      : null;
  if (id === null || name === null || n === null)
    return answer("offline money", Promise.resolve(INVALID), done, INVALID);
  const work = editCharacter(
    id,
    (player) => {
      const r =
        mode === "set"
          ? player.wallet.set(name, n, why, by)
          : player.wallet.change(name, mode === "add" ? n : -n, why, by);
      return r.ok ? { ok: true } : changeError(r.error);
    },
    () => offline.money(id, name, mode, n, why, by),
  );
  answer(`offline money of #${id}`, work, done, ERROR);
}

export function offlineJob(
  charId: unknown,
  job: unknown,
  grade: unknown,
  done: unknown,
): void {
  const id = toCharId(charId);
  const name = nameOf(job);
  const g = gradeOf(grade);
  if (id === null || name === null || g === null)
    return answer("offline job", Promise.resolve(INVALID), done, INVALID);
  // The unemployed job is never stored: a character without jobs is unemployed.
  if (name === settings.jobs.unemployed) {
    const result = fail("ADMIN_PLAYERS_ERR_JOB");
    return answer("offline job", Promise.resolve(result), done, result);
  }
  const work = editCharacter(
    id,
    (player) => {
      const r = player.jobs.set(name, g);
      return r.ok ? { ok: true } : changeError(r.error);
    },
    () => offline.setJob(id, name, g),
  );
  answer(`offline job of #${id}`, work, done, ERROR);
}

export function offlineRemoveJob(
  charId: unknown,
  job: unknown,
  done: unknown,
): void {
  const id = toCharId(charId);
  const name = nameOf(job);
  if (id === null || name === null)
    return answer("offline job", Promise.resolve(INVALID), done, INVALID);
  const work = editCharacter(
    id,
    (player) => {
      const r = player.jobs.remove(name);
      return r.ok ? { ok: true } : changeError(r.error);
    },
    () => offline.removeJob(id, name),
  );
  answer(`offline job of #${id}`, work, done, ERROR);
}

export function offlineGang(
  charId: unknown,
  gang: unknown,
  grade: unknown,
  done: unknown,
): void {
  const id = toCharId(charId);
  const name = nameOf(gang);
  const g = gradeOf(grade);
  if (id === null || name === null || g === null)
    return answer("offline gang", Promise.resolve(INVALID), done, INVALID);
  const work = editCharacter(
    id,
    (player) => {
      const r = player.gangs.set(name, g);
      return r.ok ? { ok: true } : changeError(r.error);
    },
    () => offline.setGang(id, name, g),
  );
  answer(`offline gang of #${id}`, work, done, ERROR);
}

export function offlineRemoveGang(
  charId: unknown,
  gang: unknown,
  done: unknown,
): void {
  const id = toCharId(charId);
  const name = nameOf(gang);
  if (id === null || name === null)
    return answer("offline gang", Promise.resolve(INVALID), done, INVALID);
  const work = editCharacter(
    id,
    (player) => {
      const r = player.gangs.remove(name);
      return r.ok ? { ok: true } : changeError(r.error);
    },
    () => offline.removeGang(id, name),
  );
  answer(`offline gang of #${id}`, work, done, ERROR);
}

/** A metadata value that survives the JSON bag (null / undefined removes the key). */
function toMetaValue(value: unknown): { ok: boolean; value: unknown } {
  if (value == null) return { ok: true, value: null };
  try {
    const text = JSON.stringify(value);
    return text === undefined
      ? { ok: false, value: null }
      : { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, value: null };
  }
}

export function offlineMeta(
  charId: unknown,
  key: unknown,
  value: unknown,
  done: unknown,
): void {
  const id = toCharId(charId);
  const k = typeof key === "string" && META_KEY.test(key) ? key : null;
  const v = toMetaValue(value);
  if (id === null || k === null || !v.ok)
    return answer("offline metadata", Promise.resolve(INVALID), done, INVALID);
  const work = editCharacter(
    id,
    (player) => {
      player.setMeta(k, v.value);
      return { ok: true };
    },
    () => offline.meta(id, k, v.value),
  );
  answer(`offline metadata of #${id}`, work, done, ERROR);
}
