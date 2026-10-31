import { readId } from "@aicore-fivem/lib/shared";
import { CORE, type CharacterInfo } from "@aicore-fivem/shared";
import { log } from "../log";
import { players } from "../player/registry";
import { findCharacter } from "./repo";

/** A character with its account id (`GetCharacterInfo`: the vRP bridge's offline identity and v2 `user.id`). */
export type CharacterWithUser = CharacterInfo & { userId: number };

const MAX = 5000;
const TTL_MS = 5 * 60_000;

/**
 * Stored characters read by id: one primary key read, then kept up to 5 minutes (at most 5,000; the oldest go first).
 * A loaded character answers from memory, and its entry is dropped when it loads or unloads (its name may change).
 */
class CharacterInfoCache {
  private readonly entries = new Map<
    number,
    { info: CharacterWithUser | null; until: number }
  >();
  private readonly reading = new Map<
    number,
    Array<(info: CharacterWithUser | null) => void>
  >();

  get(charId: number, done: (info: CharacterWithUser | null) => void): void {
    const player = players.byCharacter(charId);
    if (player) return done({ ...player.info(), userId: player.user.id });
    const cached = this.entries.get(charId);
    if (cached && cached.until > Date.now()) return done(cached.info);
    const waiting = this.reading.get(charId);
    if (waiting) {
      waiting.push(done);
      return;
    }
    const list = [done];
    this.reading.set(charId, list);
    findCharacter(charId)
      .then(
        (row): CharacterWithUser | null =>
          row
            ? {
                id: row.id,
                citizenid: row.citizenid,
                slot: row.slot,
                firstname: row.firstname,
                lastname: row.lastname,
                birthdate: row.birthdate,
                sex: row.sex,
                nationality: row.nationality,
                userId: row.userId,
              }
            : null,
        (error: unknown) => {
          log.error(`reading character ${charId} failed`, error);
          return null;
        },
      )
      .then((info) => {
        this.reading.delete(charId);
        this.entries.delete(charId);
        if (this.entries.size >= MAX) {
          const oldest = this.entries.keys().next();
          if (!oldest.done) this.entries.delete(oldest.value);
        }
        this.entries.set(charId, { info, until: Date.now() + TTL_MS });
        for (const fn of list) fn(info);
      });
  }

  drop(charId: number): void {
    this.entries.delete(charId);
  }
}

const cache = new CharacterInfoCache();

on(CORE.playerLoadedEvent, (_source: number, info: CharacterInfo) =>
  cache.drop(info.id),
);
on(CORE.playerUnloadedEvent, (_source: number, charId: number) =>
  cache.drop(charId),
);

/** A character by id, loaded or not: `done` gets it with its account id, or null (unknown or deleted). */
export function getCharacterInfo(
  charId: unknown,
  done: (info: CharacterWithUser | null) => void,
): void {
  const id = readId(charId);
  if (id === null) return done(null);
  cache.get(id, done);
}
