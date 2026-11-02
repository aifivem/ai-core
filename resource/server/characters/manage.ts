import { caller } from "@aifivem/lib/server";
import {
  CORE,
  toBirthdate,
  toName,
  toNationality,
  toSex,
  type CharacterInfo,
  type CharacterResult,
} from "@aifivem/shared";
import { offline } from "../admin/players/offline";
import { softDelete, updateInfo } from "../admin/players/repo";
import { charWatchers } from "../admin/players/charWatchers";
import { coreLog } from "../logs";
import { players } from "../player/registry";
import { editCharacter, fail, GONE, OK, toCharId } from "./edit";
import { findCharacter } from "./repo";
import { answer } from "./answer";

type Info = Pick<
  CharacterInfo,
  "firstname" | "lastname" | "birthdate" | "sex" | "nationality"
>;

const ERROR = fail("ADMIN_PLAYERS_ERR_BUSY");
const INVALID = fail("CORE_ERR_ARGS");

/** Who did it, for the log: a player's server id becomes their name, a text stays (64 characters). */
export function actorName(by: unknown, fallback: string): string {
  if (typeof by === "number" && by > 0) {
    const name = GetPlayerName(String(by));
    const fivem = players.get(by)?.user.fivem;
    return `${name || `#${by}`}${fivem ? ` (fivem:${fivem})` : ""}`.slice(
      0,
      64,
    );
  }
  return typeof by === "string" && by ? by.slice(0, 64) : fallback;
}

/**
 * Soft delete by a script (the row stays for logs; jobs, gangs and money rows stay with it like the character
 * screen's delete). A loaded character is refused (owner decision for scripts: kick or switch it first), so a
 * character never disappears under a playing player.
 */
export function deleteCharacterBy(
  charId: unknown,
  by: unknown,
  done: unknown,
): void {
  const id = toCharId(charId);
  const who = actorName(by, caller());
  if (id === null)
    return answer("delete character", Promise.resolve(INVALID), done, INVALID);
  const work = editCharacter(
    id,
    () => fail("ADMIN_PLAYERS_ERR_ONLINE"),
    async () => {
      const row = await findCharacter(id);
      if (!row || !(await softDelete(id))) return GONE;
      charWatchers.deleted(id);
      emit(CORE.characterDeletedEvent, id, row.userId);
      coreLog("characters", `deleted character #${id} (${who})`, {
        level: "warn",
        metadata: { charId: id, userId: row.userId, by: who },
      });
      return OK;
    },
  );
  answer(`delete character #${id}`, work, done, ERROR);
}

/** Height in centimetres (metadata `height`), a whole number 0-300 (0 = not set); null when wrong. */
export function toHeight(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value.trim()) : value;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 300
    ? Math.floor(n)
    : null;
}

/** Each given field checked like the creation form; a refusal names the wrong field (its lang key). */
function readPatch(
  raw: unknown,
): (Partial<Info> & { height?: number }) | CharacterResult {
  if (typeof raw !== "object" || raw === null) return INVALID;
  const input = raw as Record<string, unknown>;
  const patch: Partial<Info> & { height?: number } = {};
  if (input.firstname != null) {
    const v = toName(input.firstname);
    if (!v) return fail("CHAR_ERR_FIRSTNAME");
    patch.firstname = v;
  }
  if (input.lastname != null) {
    const v = toName(input.lastname);
    if (!v) return fail("CHAR_ERR_LASTNAME");
    patch.lastname = v;
  }
  if (input.birthdate != null) {
    const v = toBirthdate(input.birthdate);
    if (!v) return fail("CHAR_ERR_BIRTHDATE");
    patch.birthdate = v;
  }
  if (input.nationality != null) {
    const v = toNationality(input.nationality);
    if (!v) return fail("CHAR_ERR_NATIONALITY");
    patch.nationality = v;
  }
  // QB's `gender` (0 male, 1 female) when `sex` is not given.
  const sex =
    input.sex ??
    (input.gender === 0
      ? "male"
      : input.gender === 1
        ? "female"
        : input.gender);
  if (sex != null) {
    const v = toSex(sex);
    if (!v) return fail("CHAR_ERR_SEX");
    patch.sex = v;
  }
  if (input.height != null) {
    const v = toHeight(input.height);
    if (v === null) return fail("CHAR_ERR_HEIGHT");
    patch.height = v;
  }
  return patch;
}

/**
 * Name, birth date, nationality, sex and height (metadata `height`) of a character; a loaded one gets the change as
 * `character` / `metadata` deltas.
 */
export function setCharacterInfo(
  charId: unknown,
  raw: unknown,
  done: unknown,
): void {
  const id = toCharId(charId);
  const patch = readPatch(raw);
  if (id === null || "ok" in patch) {
    const result = "ok" in patch ? patch : INVALID;
    return answer("character info", Promise.resolve(result), done, result);
  }
  const { height, ...fields } = patch;
  const work = editCharacter(
    id,
    async (player) => {
      const info: Info = { ...player.info(), ...fields };
      // The sex is data only: the ped model stays the stored look's (owner decision).
      if (height !== undefined) player.setMeta("height", height);
      if (Object.keys(fields).length === 0) return OK;
      await updateInfo(id, info);
      // The write took time: the character may have unloaded meanwhile (the row is right either way).
      if (players.byCharacter(id) === player) player.setInfo(info);
      return OK;
    },
    async () => {
      const row = await findCharacter(id);
      if (!row) return GONE;
      const { firstname, lastname, birthdate, sex, nationality } = row;
      const info: Info = {
        firstname,
        lastname,
        birthdate,
        sex,
        nationality,
        ...fields,
      };
      if (height !== undefined) {
        const r = await offline.meta(id, "height", height);
        if (!r.ok) return r;
      }
      return Object.keys(fields).length === 0 ? OK : offline.info(id, info);
    },
  );
  answer(`character info of #${id}`, work, done, ERROR);
}
