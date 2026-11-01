import { caller } from "@aicore-fivem/lib/server";
import {
  CORE,
  toBirthdate,
  toName,
  toNationality,
  toSex,
  type CharacterInfo,
  type CharacterResult,
} from "@aicore-fivem/shared";
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

/** Each given field checked like the creation form; null = a field is wrong (its lang key). */
function readPatch(raw: unknown): Partial<Info> | CharacterResult {
  if (typeof raw !== "object" || raw === null) return INVALID;
  const input = raw as Record<string, unknown>;
  const patch: Partial<Info> = {};
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
  if (input.sex != null) {
    const v = toSex(input.sex);
    if (!v) return fail("CHAR_ERR_SEX");
    patch.sex = v;
  }
  return patch;
}

/** Name, birth date, nationality and sex of a character; a loaded one gets the change as a `character` delta. */
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
  const work = editCharacter(
    id,
    async (player) => {
      const info: Info = { ...player.info(), ...patch };
      // The ped model follows the sex: only changed while the character is not loaded.
      if (info.sex !== player.info().sex)
        return fail("ADMIN_PLAYERS_ERR_SEX_ONLINE");
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
        ...patch,
      };
      return offline.info(id, info);
    },
  );
  answer(`character info of #${id}`, work, done, ERROR);
}
