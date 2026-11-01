import {
  CORE,
  type CharacterActionResult,
  type UnloadReason,
} from "@aicore-fivem/shared";
import { getCharacter } from "../characters/repo";
import { saveCharacters } from "../characters/save";
import { log } from "../log";
import { moneyWriter } from "../money/writer";
import { BUSY, lock } from "./actionLock";
import { Player } from "./player";
import { claims, players, selecting } from "./registry";
import { spawnCharacter } from "./spawn";
import type { User } from "./users";

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

/** Loads one of the account's characters and puts it into the world (refused while an admin edits it offline). */
export function loadCharacter(
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
