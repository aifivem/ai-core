import {
  ADMIN_PLAYERS,
  type CharacterView,
  type PlayersDelta,
} from "common/adminPlayers";
import { KeyWatchers } from "@aicore-fivem/lib/server";

/**
 * Admins with one character open in the Players screen: they get that character's changes. The `open` snapshot
 * subscribes, the screen's close prunes, a drop frees it. Nothing is sent while nobody watches.
 */
class CharWatchers {
  /** The character each admin has open (one each, freed on drop). */
  private readonly chars = new KeyWatchers<number>();

  /** An admin watches one character at a time; opening another replaces it. */
  watchChar(admin: number, charId: number): void {
    this.chars.watch(admin, charId);
  }

  unwatchChar(admin: number): void {
    this.chars.stop(admin);
  }

  watching(charId: number): boolean {
    return this.chars.of(charId) !== undefined;
  }

  char(charId: number, patch: Partial<CharacterView>): void {
    this.toChar(charId, { kind: "char", charId, patch });
  }

  money(charId: number, account: string, balance: number): void {
    this.toChar(charId, { kind: "money", charId, account, balance });
  }

  meta(charId: number, key: string, value: unknown): void {
    if (this.watching(charId))
      this.toChar(charId, { kind: "meta", charId, key, value });
  }

  view(view: CharacterView): void {
    this.toChar(view.charId, { kind: "view", view });
  }

  deleted(charId: number): void {
    this.toChar(charId, { kind: "gone", charId });
  }

  private toChar(charId: number, delta: PlayersDelta): void {
    const set = this.chars.of(charId);
    if (!set) return;
    for (const admin of set) emitNet(ADMIN_PLAYERS.deltaEvent, admin, delta);
  }
}

export const charWatchers = new CharWatchers();
