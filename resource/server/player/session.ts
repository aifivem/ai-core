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
  type SpawnPoint,
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
import {
  enterSelectBucket,
  enterWorldBucket,
  leaveSelectBucket,
} from "./buckets";
import { Player } from "./player";
import { claims, players, selecting } from "./registry";
import { characterScreen, slotsOf } from "./screen";
import { identify, upsertUser } from "./users";

const lock = new SourceLock();
const BUSY: CharacterActionResult = { ok: false, error: "CHAR_ERR_BUSY" };

/** First call of the character screen after joining (or after switching): the account and its characters. */
onClientCallback(
  CORE.charactersCallback,
  async (source): Promise<CharacterScreen | null> => {
    if (players.get(source)) return null;
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
    const user = selecting.get(source);
    const input = toCreateCharacter(raw);
    if (!user) return BUSY;
    if ("error" in input) return { ok: false, error: input.error };
    return lock.run(source, BUSY, async () => {
      const characters = await listCharacters(user.id);
      if (input.slot > slotsOf(user) || characters.length >= slotsOf(user))
        return { ok: false, error: "CHAR_ERR_LIMIT" };
      if (characters.some((c) => c.slot === input.slot))
        return { ok: false, error: "CHAR_ERR_SLOT_TAKEN" };
      const id = await insertCharacter(user.id, input);
      coreLog(
        "characters",
        `created ${input.firstname} ${input.lastname} in slot ${input.slot}`,
        { source, metadata: { charId: id } },
      );
      return loadCharacter(source, id);
    });
  },
);

onClientCallback(
  CORE.selectCharacterCallback,
  { args: charIdArg },
  async (source, charId): Promise<CharacterActionResult> => {
    if (!selecting.has(source)) return BUSY;
    return lock.run(source, BUSY, () => loadCharacter(source, charId));
  },
);

onClientCallback(
  CORE.deleteCharacterCallback,
  { args: charIdArg },
  async (source, charId): Promise<CharacterActionResult> => {
    const user = selecting.get(source);
    if (!user) return BUSY;
    if (!settings.characters.canDelete)
      return { ok: false, error: "CHAR_ERR_NO_DELETE" };
    if (players.byCharacter(charId))
      return { ok: false, error: "CHAR_ERR_ONLINE" };
    return lock.run(source, BUSY, async () => {
      if (!(await deleteCharacter(user.id, charId)))
        return { ok: false, error: "CHAR_ERR_GONE" };
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
    enterWorldBucket(source);
    player.sendSnapshot();
    const position = player.spawnPosition();
    const spawn: SpawnPoint = {
      ...position,
      model: row.sex === "female" ? "mp_f_freemode_01" : "mp_m_freemode_01",
    };
    emitNet(CORE.spawnEvent, source, spawn);
    emit(CORE.playerLoadedEvent, source, player.info());
    log.info(`loaded #${player.charId} ${player.fullName} (src ${source})`);
    return { ok: true };
  } catch (error) {
    log.error(`loading character ${charId} for ${source} failed`, error);
    return BUSY;
  }
}

/** Lets go of a loaded character: saves it, tells every resource, clears every per-source trace. */
export async function unloadCharacter(
  player: Player,
  reason: UnloadReason,
): Promise<void> {
  emit(CORE.playerUnloadedEvent, player.source, player.charId, reason);
  players.remove(player);
  player.release();
  await claims.hold(player.charId, async () => {
    try {
      await saveCharacters([player.saveData()]);
    } catch (error) {
      log.error(`saving #${player.charId} on unload failed`, error);
    }
  });
}

/** Back to the character screen (logout without leaving): the client reopens the screen. */
export function switchCharacter(source: number): boolean {
  const player = players.get(source);
  if (!player) return false;
  void lock.run(source, null, async () => {
    await unloadCharacter(player, "switch");
    selecting.set(source, player.user);
    emitNet(CORE.openCharactersEvent, source);
  });
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
