import { PlayerMap, registerExport } from "@aicore-fivem/lib/server";
import { isRecord, readInt } from "@aicore-fivem/lib/shared";
import {
  CORE,
  toBirthdate,
  toName,
  toNationality,
  toSex,
  type CharacterActionResult,
  type CreateCharacterInput,
} from "@aicore-fivem/shared";
import { listCharacters } from "../characters/repo";
import { answer } from "../characters/writes";
import { databaseReady } from "../database";
import { log } from "../log";
import { enterWorldBucket } from "../player/buckets";
import { players, selecting } from "../player/registry";
import {
  createCharacterFor,
  loginCharacterFor,
  logoutCharacter,
} from "../player/session";
import { identify, upsertUser, type User } from "../player/users";
import { projection } from "./projection";
import { externalScreen, onScreenSwitch } from "./screen";

/**
 * Login entry points for an external character screen (the bridge calls them from QB `Login`, ESX
 * `esx:onPlayerJoined`, Qbox `Login`). They load through the same path as ai-core's own screen (`player/session.ts`);
 * the spawn is the external script's (`player/spawn.ts`).
 */

const fail = (error: string): CharacterActionResult => ({ ok: false, error });
const OK: CharacterActionResult = { ok: true };
const INVALID = fail("CHAR_ERR_INVALID");
const BUSY = fail("CHAR_ERR_BUSY");

/** A joining player's account being prepared (upsert, framework rows) while an external screen or the tables are on. */
const preparing = new PlayerMap<Promise<void>>();

async function prepare(source: number): Promise<void> {
  await databaseReady;
  const identity = identify(source);
  // The connection gate refused players without a FiveM account already.
  if (!identity || players.get(source)) return;
  const user = selecting.get(source) ?? (await upsertUser(identity));
  if (!GetPlayerName(String(source)) || players.get(source)) return;
  selecting.set(source, user);
  projection.connected(source, user.id);
}

on("playerJoining", () => {
  const source = Number(globalThis.source);
  if (!externalScreen() && !projection.active()) return;
  preparing.set(
    source,
    prepare(source).catch((error: unknown) =>
      log.error(`preparing the account of ${source} failed`, error),
    ),
  );
});

/** A connected player's server id, or null. */
function toSource(value: unknown): number | null {
  const source = readInt(value, 1, 0x7fffffff);
  return source !== null && GetPlayerName(String(source)) ? source : null;
}

type Ref = { id: number } | { slot: number } | { citizenid: string };

function toRef(value: unknown): Ref | null {
  const id = readInt(value, 1, 0x7fffffff);
  if (id !== null) return { id };
  if (!isRecord(value)) return null;
  const slot = readInt(value.slot, 1, 255);
  if (slot !== null) return { slot };
  return typeof value.citizenid === "string" &&
    value.citizenid.length > 0 &&
    value.citizenid.length <= 16
    ? { citizenid: value.citizenid }
    : null;
}

/** The account's character a reference names (ownership: `loadNow` reads it by account id again). */
async function find(user: User, ref: Ref): Promise<number | null> {
  if ("id" in ref) return ref.id;
  const list = await listCharacters(user.id);
  const row =
    "slot" in ref
      ? list.find((c) => c.slot === ref.slot)
      : list.find((c) => c.citizenid === ref.citizenid);
  return row?.id ?? null;
}

type NewCharacter = Omit<CreateCharacterInput, "slot"> & {
  slot: number | null;
};

/** Checked like the create form (`toCreateCharacter`); nationality and slot may be left out. */
function toNewCharacter(raw: unknown): NewCharacter | CharacterActionResult {
  if (!isRecord(raw)) return INVALID;
  const firstname = toName(raw.firstname);
  const lastname = toName(raw.lastname);
  const birthdate = toBirthdate(raw.birthdate);
  const sex = toSex(raw.sex);
  const nationality =
    raw.nationality == null || raw.nationality === ""
      ? ""
      : toNationality(raw.nationality);
  const slot = raw.slot == null ? null : readInt(raw.slot, 1, 255);
  if (raw.slot != null && slot === null) return INVALID;
  if (!firstname) return fail("CHAR_ERR_FIRSTNAME");
  if (!lastname) return fail("CHAR_ERR_LASTNAME");
  if (!birthdate) return fail("CHAR_ERR_BIRTHDATE");
  if (!sex) return fail("CHAR_ERR_SEX");
  if (nationality === null) return fail("CHAR_ERR_NATIONALITY");
  return { slot, firstname, lastname, birthdate, sex, nationality };
}

const whenPrepared = (source: number): Promise<void> =>
  preparing.get(source) ?? Promise.resolve();

registerExport("GetCharacterScreen", () => externalScreen() ?? CORE.resource);

registerExport(
  "LoginCharacter",
  (source: unknown, ref: unknown, done?: unknown) => {
    const src = toSource(source);
    const pick = toRef(ref);
    if (src === null || pick === null)
      return answer("login", Promise.resolve(INVALID), done, INVALID);
    const work = whenPrepared(src).then(() =>
      loginCharacterFor(src, (user) => find(user, pick)),
    );
    answer(`login of ${src}`, work, done, BUSY);
  },
);

registerExport(
  "CreateAndLoginCharacter",
  (source: unknown, raw: unknown, done?: unknown) => {
    const src = toSource(source);
    const input = toNewCharacter(raw);
    if (src === null || "ok" in input) {
      const result = src === null ? INVALID : (input as CharacterActionResult);
      return answer("create", Promise.resolve(result), done, result);
    }
    const work = whenPrepared(src).then(() => createCharacterFor(src, input));
    answer(`create for ${src}`, work, done, BUSY);
  },
);

registerExport("LogoutCharacter", (source: unknown, done?: unknown) => {
  const src = toSource(source);
  if (src === null)
    return answer("logout", Promise.resolve(INVALID), done, INVALID);
  const work = logoutCharacter(src).then((ok) =>
    ok ? OK : fail("CHAR_ERR_NOT_LOADED"),
  );
  answer(`logout of ${src}`, work, done, BUSY);
});

// Players without a character follow the switch: out of ai-core's bucket, or onto ai-core's screen again.
onScreenSwitch((external) => {
  for (const source of selecting.keys()) {
    if (external) enterWorldBucket(source);
    else emitNet(CORE.openCharactersEvent, source);
  }
});
