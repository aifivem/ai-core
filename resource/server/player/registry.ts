import type { Player } from "./player";
import type { User } from "./users";

/** Every online player with a loaded character, by server id, character id and citizen id. */
class PlayerRegistry {
  private readonly bySource = new Map<number, Player>();
  private readonly byCharId = new Map<number, Player>();
  private readonly byCitizenId = new Map<string, Player>();

  add(player: Player): void {
    this.bySource.set(player.source, player);
    this.byCharId.set(player.charId, player);
    this.byCitizenId.set(player.citizenid, player);
  }

  remove(player: Player): void {
    this.bySource.delete(player.source);
    this.byCharId.delete(player.charId);
    this.byCitizenId.delete(player.citizenid);
  }

  get(source: number): Player | undefined {
    return this.bySource.get(source);
  }

  byCharacter(charId: number): Player | undefined {
    return this.byCharId.get(charId);
  }

  byCitizen(citizenid: string): Player | undefined {
    return this.byCitizenId.get(citizenid);
  }

  all(): IterableIterator<Player> {
    return this.bySource.values();
  }

  get size(): number {
    return this.bySource.size;
  }
}

export const players = new PlayerRegistry();

/** Connected players without a loaded character (on the character screen), with their account. */
export const selecting = new Map<number, User>();

/**
 * Characters whose DB rows are in use outside a loaded player: loading, saving on unload, an admin's offline edit.
 * A load or an offline edit waits for none of them: it is refused while the character is held.
 */
class CharacterClaims {
  private readonly held = new Map<number, number>();

  has(charId: number): boolean {
    return this.held.has(charId);
  }

  /** Runs `work` with the character held (always runs; nested holds count). */
  async hold<T>(charId: number, work: () => Promise<T>): Promise<T> {
    this.held.set(charId, (this.held.get(charId) ?? 0) + 1);
    try {
      return await work();
    } finally {
      const left = (this.held.get(charId) ?? 1) - 1;
      if (left > 0) this.held.set(charId, left);
      else this.held.delete(charId);
    }
  }

  /** Runs `work` with the character held, or answers `busy` when someone holds it already. */
  run<T>(charId: number, busy: T, work: () => Promise<T>): Promise<T> {
    return this.has(charId) ? Promise.resolve(busy) : this.hold(charId, work);
  }
}

export const claims = new CharacterClaims();
