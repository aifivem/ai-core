import { caller } from "@aifivem/lib/server";
import { isRecord } from "@aifivem/lib/shared";
import { CORE, type CharacterResult } from "@aifivem/shared";
import { offline } from "../admin/players/offline";
import { settings } from "../content";
import { coreLog } from "../logs";
import type { Player } from "../player/player";
import { players } from "../player/registry";
import { answer } from "./answer";
import { editCharacter, fail, GONE, readCharacter, toCharId } from "./edit";
import { charIdOfCitizen, findCharacter } from "./repo";

/**
 * Legal / illegal status of a character (metadata `illegal`, a boolean): one flag scripts ask before illegal content
 * (drugs, robberies, businesses). Loaded characters answer from memory; stored ones are read and written like every
 * script write by id (`edit.ts`). Panel switch `illegal.enabled` off = everyone is legal and writes are refused.
 */

const KEY = "illegal";
const OFF = fail("ILLEGAL_ERR_OFF");
const INVALID = fail("CORE_ERR_ARGS");

const flagOf = (player: Player): boolean => player.getMeta(KEY) === true;

const citizenOf = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 && v.length <= 16 ? v : null;

/** A loaded character named by a server id, citizenid or `{ charId }`. */
function loadedOf(target: unknown): Player | undefined {
  if (typeof target === "number") return players.get(target);
  const citizenid = citizenOf(target);
  if (citizenid !== null) return players.byCitizen(citizenid);
  const charId = isRecord(target) ? toCharId(target.charId) : null;
  return charId === null ? undefined : players.byCharacter(charId);
}

/** The character id of a stored character's citizenid or `{ charId }`; null when the target names none. */
async function charIdOf(target: unknown): Promise<number | null> {
  const citizenid = citizenOf(target);
  if (citizenid !== null) return charIdOfCitizen(citizenid);
  return isRecord(target) ? toCharId(target.charId) : null;
}

/** Export `IsIllegal`: at once for a server id or a loaded character, else null and `done` gets the stored flag. */
export function isIllegal(target: unknown, done?: unknown): boolean | null {
  const reply = (value: boolean | null): boolean | null => {
    if (typeof done === "function")
      (done as (v: boolean | null) => void)(value);
    return value;
  };
  if (!settings.illegal.enabled) return reply(false);
  const loaded = loadedOf(target);
  if (loaded) return reply(flagOf(loaded));
  if (typeof target === "number") return reply(false);
  const work = charIdOf(target).then((charId) =>
    charId === null
      ? null
      : readCharacter<boolean | null>(
          charId,
          flagOf,
          async () => {
            const row = await findCharacter(charId);
            return row ? row.metadata[KEY] === true : null;
          },
          null,
        ),
  );
  answer("illegal status", work, done, null);
  return null;
}

/** Sets the flag of a character by id, loaded or not; logs and fires `CORE.illegalChangedEvent` once written. */
export async function changeIllegal(
  charId: number,
  illegal: boolean,
  by: string,
): Promise<CharacterResult> {
  if (!settings.illegal.enabled) return OFF;
  const result = await editCharacter(
    charId,
    (player) => {
      player.setMeta(KEY, illegal);
      return { ok: true };
    },
    () => offline.meta(charId, KEY, illegal),
  );
  if (!result.ok) return result;
  const source = players.byCharacter(charId)?.source ?? null;
  emit(CORE.illegalChangedEvent, charId, illegal, source);
  coreLog(
    "characters",
    `character #${charId} is now ${illegal ? "illegal" : "legal"} (${by})`,
    { source: source ?? undefined, metadata: { charId, illegal, by } },
  );
  return result;
}

/** Export `SetIllegal(target, illegal, done?)`. */
export function setIllegal(
  target: unknown,
  illegal: unknown,
  done?: unknown,
): void {
  const by = caller();
  if (typeof illegal !== "boolean")
    return answer("illegal status", Promise.resolve(INVALID), done, INVALID);
  const work = (async (): Promise<CharacterResult> => {
    const charId =
      typeof target === "number"
        ? (players.get(target)?.charId ?? null)
        : await charIdOf(target);
    return charId === null ? GONE : changeIllegal(charId, illegal, by);
  })();
  answer("illegal status", work, done, INVALID);
}
