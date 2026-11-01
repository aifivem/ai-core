import {
  onClientCallback,
  registerExport,
  SourceLock,
} from "@aicore-fivem/lib/server";
import {
  CORE,
  toCreateCharacter,
  type CharacterActionResult,
  type CharacterScreen,
  type CreateCharacterInput,
  type UnloadReason,
} from "@aicore-fivem/shared";
import { Locale } from "common";
import {
  deleteCharacter,
  getCharacter,
  insertCharacter,
  listCharacters,
  saveCharacters,
} from "../characters/repo";
import { settings } from "../content";
import { databaseReady } from "../database";
import { log } from "../log";
import { coreLog } from "../logs";
import { moneyWriter } from "../money/writer";
import { externalScreen } from "../multichar/screen";
import { enterSelectBucket, leaveSelectBucket } from "./buckets";
import { Player } from "./player";
import { claims, players, selecting } from "./registry";
import { characterScreen, slotsOf } from "./screen";
import { spawnCharacter } from "./spawn";
import { identify, upsertUser, type User } from "./users";

const lock = new SourceLock();
const BUSY: CharacterActionResult = { ok: false, error: "CHAR_ERR_BUSY" };

/** First call of the character screen after joining (or after switching): the account and its characters. */
onClientCallback(
  CORE.charactersCallback,
  async (source): Promise<CharacterScreen | null> => {
    // An external character screen runs: ai-core's stays shut (no bucket, no cards).
    if (players.get(source) || externalScreen()) return null;
    return lock.run(source, null, async () => {
      await databaseReady;
      let user = selecting.get(source);
      if (!user) {
        const identity = identify(source);
        if (!identity) {
          DropPlayer(String(source), Locale("CONNECT_NO_FIVEM"));
          return null;
        }
        user = await upsertUser(identity);
        selecting.set(source, user);
      }
      enterSelectBucket(source);
      const screen = await characterScreen(user);
      emit(
        CORE.characterScreenEvent,
        source,
        screen.characters.map((card) => card.id),
      );
      return screen;
    });
  },
);

/** A character id from the client: a whole positive number (ownership is checked against the account later). */
const charIdArg = ([charId]: unknown[]): [number] | null =>
  typeof charId === "number" && Number.isInteger(charId) && charId > 0
    ? [charId]
    : null;

// The form is checked by toCreateCharacter, which names the failing field for the screen.
onClientCallback(
  CORE.createCharacterCallback,
  { args: ([raw]) => [raw] },
  async (source, raw): Promise<CharacterActionResult> => {
    // Under an external screen characters are made only through its login exports, never from ai-core's screen.
    if (externalScreen()) return BUSY;
    const user = selecting.get(source);
    const input = toCreateCharacter(raw);
    if (!user) return BUSY;
    if ("error" in input) return { ok: false, error: input.error };
    return lock.run(source, BUSY, () => createNow(source, user, input));
  },
);

type NewCharacter = Omit<CreateCharacterInput, "slot"> & {
  slot: number | null;
};

/** Creates a character on the account (slot limit; `slot` null = the first free one) and loads it. */
async function createNow(
  source: number,
  user: User,
  input: NewCharacter,
): Promise<CharacterActionResult> {
  const characters = await listCharacters(user.id);
  const slots = slotsOf(user);
  const taken = new Set(characters.map((c) => c.slot));
  let slot = input.slot;
  for (let s = 1; slot === null && s <= slots; s++) if (!taken.has(s)) slot = s;
  if (slot === null || slot > slots || characters.length >= slots)
    return { ok: false, error: "CHAR_ERR_LIMIT" };
  if (taken.has(slot)) return { ok: false, error: "CHAR_ERR_SLOT_TAKEN" };
  const id = await insertCharacter(user.id, { ...input, slot });
  coreLog(
    "characters",
    `created ${input.firstname} ${input.lastname} in slot ${slot}`,
    { source, metadata: { charId: id } },
  );
  return loadCharacter(source, id);
}

/** A script creates and loads a character for a player without one (`CreateAndLoginCharacter`). */
export function createCharacterFor(
  source: number,
  input: NewCharacter,
): Promise<CharacterActionResult> {
  const user = selecting.get(source);
  if (!user) return Promise.resolve(BUSY);
  return lock.run(source, BUSY, () => createNow(source, user, input));
}

/** A script loads one of the player's own characters (`LoginCharacter`); `find` names it, null = none. */
export function loginCharacterFor(
  source: number,
  find: (user: User) => Promise<number | null>,
): Promise<CharacterActionResult> {
  const user = selecting.get(source);
  if (!user) return Promise.resolve(BUSY);
  return lock.run(source, BUSY, async () => {
    const charId = await find(user);
    return charId === null
      ? { ok: false, error: "CHAR_ERR_GONE" }
      : loadCharacter(source, charId);
  });
}

onClientCallback(
  CORE.selectCharacterCallback,
  { args: charIdArg },
  async (source, charId): Promise<CharacterActionResult> => {
    if (externalScreen() || !selecting.has(source)) return BUSY;
    return lock.run(source, BUSY, () => loadCharacter(source, charId));
  },
);

onClientCallback(
  CORE.deleteCharacterCallback,
  { args: charIdArg },
  async (source, charId): Promise<CharacterActionResult> => {
    const user = selecting.get(source);
    if (externalScreen() || !user) return BUSY;
    if (!settings.characters.canDelete)
      return { ok: false, error: "CHAR_ERR_NO_DELETE" };
    if (players.byCharacter(charId))
      return { ok: false, error: "CHAR_ERR_ONLINE" };
    return lock.run(source, BUSY, async () => {
      if (!(await deleteCharacter(user.id, charId)))
        return { ok: false, error: "CHAR_ERR_GONE" };
      emit(CORE.characterDeletedEvent, charId, user.id);
      coreLog("characters", `deleted character #${charId}`, {
        level: "warn",
        source,
        metadata: { charId },
      });
      return { ok: true };
    });
  },
);

/** Loads one of the account's characters and puts it into the world (refused while an admin edits it offline). */
function loadCharacter(
  source: number,
  charId: number,
): Promise<CharacterActionResult> {
  return claims.run(charId, BUSY, () => loadNow(source, charId));
}

async function loadNow(
  source: number,
  charId: number,
): Promise<CharacterActionResult> {
  const user = selecting.get(source);
  if (!user) return BUSY;
  if (players.byCharacter(charId))
    return { ok: false, error: "CHAR_ERR_ONLINE" };
  try {
    const row = await getCharacter(user.id, charId);
    if (!row) return { ok: false, error: "CHAR_ERR_GONE" };
    const player = await Player.load(source, user, row);
    // The player may have left while the rows were loading.
    if (!GetPlayerName(String(source)) || !selecting.has(source)) {
      player.release();
      return BUSY;
    }
    selecting.delete(source);
    players.add(player);
    player.sendSnapshot();
    const spawned = spawnCharacter(source, player, row);
    emit(CORE.playerLoadedEvent, source, player.info());
    if (spawned) emit(CORE.playerSpawnedEvent, source, player.charId);
    log.info(`loaded #${player.charId} ${player.fullName} (src ${source})`);
    return { ok: true };
  } catch (error) {
    log.error(`loading character ${charId} for ${source} failed`, error);
    return BUSY;
  }
}

/**
 * Lets go of a loaded character: saves it, tells every resource, clears every per-source trace. The claim lasts until
 * the save and every write the character queued (memberships, its money batch) are in the DB, so a stored-character
 * write or a load right after the unload never runs before them.
 */
export async function unloadCharacter(
  player: Player,
  reason: UnloadReason,
): Promise<void> {
  emit(CORE.playerUnloadedEvent, player.source, player.charId, reason);
  players.remove(player);
  player.release();
  await claims.hold(player.charId, async () => {
    const save = saveCharacters([player.saveData()]).catch((error: unknown) =>
      log.error(`saving #${player.charId} on unload failed`, error),
    );
    // settled(), not idle(): a drop waits for the batch's own timer instead of sending one transaction per drop.
    await Promise.all([save, player.writes.idle(), moneyWriter.settled()]);
  });
}

/**
 * Back to the character screen (logout without leaving): ai-core's screen opens again, or an external one is told
 * (`externalLogoutEvent`) and shows itself. Resolves false when no character is loaded (or another action runs).
 */
export function logoutCharacter(source: number): Promise<boolean> {
  const player = players.get(source);
  if (!player) return Promise.resolve(false);
  return lock.run(source, false, async () => {
    if (players.get(source) !== player) return false;
    await unloadCharacter(player, "switch");
    selecting.set(source, player.user);
    emitNet(
      externalScreen() ? CORE.externalLogoutEvent : CORE.openCharactersEvent,
      source,
    );
    return true;
  });
}

export function switchCharacter(source: number): boolean {
  if (!players.get(source)) return false;
  void logoutCharacter(source);
  return true;
}

registerExport("SwitchCharacter", switchCharacter);

on("playerDropped", () => {
  const source = Number(globalThis.source);
  lock.release(source);
  selecting.delete(source);
  leaveSelectBucket(source);
  const player = players.get(source);
  if (player) void unloadCharacter(player, "dropped");
});
