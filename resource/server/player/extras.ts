import { isRecord } from "@aicore-fivem/lib/shared";
import { readCharacter, toCharId } from "../characters/edit";
import { findCharacter, saveCharacters } from "../characters/repo";
import { answer } from "../characters/writes";
import { log } from "../log";
import { players } from "./registry";

/** Player extras for scripts and the bridge: paycheck switch, play time, a forced save. */

export function setPaycheckEnabled(source: unknown, on: unknown): boolean {
  const player = typeof source === "number" ? players.get(source) : undefined;
  if (!player || typeof on !== "boolean") return false;
  player.paycheck = on;
  return true;
}

export function isPaycheckEnabled(source: unknown): boolean {
  return typeof source === "number"
    ? (players.get(source)?.paycheck ?? false)
    : false;
}

const storedPlayTime = (metadata: Record<string, unknown>): number => {
  const value = metadata.playtime;
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
};

/**
 * Seconds played. A server id answers from memory (null when not loaded); `{ charId }` answers from memory while
 * loaded, else returns null and `done` gets the stored metadata `playtime` (null for an unknown character).
 */
export function getPlayTime(target: unknown, done: unknown): number | null {
  if (typeof target === "number") {
    const seconds = players.get(target)?.playTime() ?? null;
    if (typeof done === "function")
      (done as (s: number | null) => void)(seconds);
    return seconds;
  }
  const charId = isRecord(target) ? toCharId(target.charId) : null;
  const loaded = charId === null ? undefined : players.byCharacter(charId);
  if (charId === null || loaded) {
    const seconds = loaded?.playTime() ?? null;
    if (typeof done === "function")
      (done as (s: number | null) => void)(seconds);
    return seconds;
  }
  const work = readCharacter<number | null>(
    charId,
    (player) => player.playTime(),
    async () => {
      const row = await findCharacter(charId);
      return row ? storedPlayTime(row.metadata) : null;
    },
    null,
  );
  answer(`play time of #${charId}`, work, done, null);
  return null;
}

/** Writes a loaded player's position and metadata now (the periodic flush for one player) and waits for their queued writes. */
export function savePlayer(source: unknown, done: unknown): void {
  const player = typeof source === "number" ? players.get(source) : undefined;
  if (!player)
    return answer("save player", Promise.resolve(false), done, false);
  const work = saveCharacters([player.saveData()])
    .then(() => player.idle())
    .then(() => true)
    .catch((error: unknown) => {
      log.error(`saving #${player.charId} failed`, error);
      return false;
    });
  answer(`save #${player.charId}`, work, done, false);
}
