import { waitFor } from "@aicore-fivem/lib/shared";
import type { CharacterResult } from "@aicore-fivem/shared";
import { characterExists } from "../admin/players/repo";
import { moneyWriter } from "../money/writer";
import type { Player } from "../player/player";
import { claims, players } from "../player/registry";

/** How long a script's write waits for a load, an unload save or an admin's edit holding the character. */
const HOLD_WAIT_MS = 30_000;
/** Holders found between the wait and the hold (a load that started in between) before the write gives up. */
const ATTEMPTS = 5;

export const OK: CharacterResult = { ok: true };
export const fail = (error: string): CharacterResult => ({ ok: false, error });
export const BUSY = fail("ADMIN_PLAYERS_ERR_BUSY");
export const GONE = fail("ADMIN_PLAYERS_ERR_GONE");

/** Sentinels of one attempt: someone else held the character, or it loaded meanwhile. */
const HELD = Symbol("held");
const LOADED = Symbol("loaded");

/**
 * Script writes of characters by id, loaded or not. One at a time per character (a queue per id), so two writes
 * never read the same stored state. A loaded character changes through its `Player` (memory first, the live path);
 * a stored one changes while `claims` holds it, so it cannot load meanwhile and no unload save or admin edit runs
 * beside it. Before the stored path the money writer is drained: a just-unloaded player's last changes are in the DB
 * before balances are read again.
 */
class CharacterEdits {
  private readonly queues = new Map<number, Promise<unknown>>();

  run<T>(
    charId: number,
    online: (player: Player) => T | Promise<T>,
    offline: () => Promise<T>,
    gone: T,
    busy: T,
  ): Promise<T> {
    const previous = this.queues.get(charId) ?? Promise.resolve();
    const next = previous.then(
      () => this.attempt(charId, online, offline, gone, busy),
      () => this.attempt(charId, online, offline, gone, busy),
    );
    this.queues.set(charId, next);
    const done = (): void => {
      if (this.queues.get(charId) === next) this.queues.delete(charId);
    };
    // Both branches: a failed write is the caller's to log, not an unhandled rejection here.
    next.then(done, done);
    return next;
  }

  private async attempt<T>(
    charId: number,
    online: (player: Player) => T | Promise<T>,
    offline: () => Promise<T>,
    gone: T,
    busy: T,
  ): Promise<T> {
    for (let i = 0; i < ATTEMPTS; i++) {
      const player = players.byCharacter(charId);
      if (player) return online(player);
      try {
        await waitFor(() => !claims.has(charId) || undefined, HOLD_WAIT_MS, 50);
      } catch {
        return busy;
      }
      if (players.byCharacter(charId)) continue;
      const result = await claims.run<T | typeof HELD | typeof LOADED>(
        charId,
        HELD,
        async () => {
          if (players.byCharacter(charId)) return LOADED;
          if (!(await characterExists(charId))) return gone;
          await moneyWriter.idle();
          return offline();
        },
      );
      if (result !== HELD && result !== LOADED) return result;
    }
    return busy;
  }
}

const edits = new CharacterEdits();

/** Runs a character write on the loaded character or on the stored one (`CharacterResult` refusals: busy / gone). */
export function editCharacter(
  charId: number,
  online: (player: Player) => CharacterResult | Promise<CharacterResult>,
  offline: () => Promise<CharacterResult>,
): Promise<CharacterResult> {
  return edits.run(charId, online, offline, GONE, BUSY);
}

/** Same queue and hold for a read: the answer of a stored character is read when nothing writes it. */
export function readCharacter<T>(
  charId: number,
  online: (player: Player) => T,
  offline: () => Promise<T>,
  missing: T,
): Promise<T> {
  return edits.run(charId, online, offline, missing, missing);
}

/** A character id from another resource: a whole number 1 .. 2^32-1. */
export const toCharId = (v: unknown): number | null =>
  typeof v === "number" && Number.isInteger(v) && v > 0 && v < 2 ** 32
    ? v
    : null;
