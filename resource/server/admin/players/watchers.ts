import {
  ADMIN_PLAYERS,
  type CharacterView,
  type OnlineRow,
  type PlayersDelta,
} from "common/adminPlayers";
import type { Player } from "../../player/player";
import { players } from "../../player/registry";

/** One row of the online list. */
export function onlineRow(player: Player): OnlineRow {
  const job = player.jobs.current();
  return {
    source: player.source,
    charId: player.charId,
    citizenid: player.citizenid,
    name: player.fullName,
    account: GetPlayerName(String(player.source)) || "",
    job: job.job,
    grade: job.grade,
    duty: player.jobs.onDuty() !== null,
  };
}

/** List rows are collected and sent once per this window (a restart loads thousands of characters in a minute). */
const LIST_FLUSH_MS = 1000;
/** Rows per list event (~60 KB); a flush with more sends the rest in the next windows. */
const ROWS_PER_EVENT = 500;
/** Latent send rate per admin: 2,048 rows (~240 KB) arrive in about a second without holding up other traffic. */
const LIST_BPS = 250_000;

/**
 * List traffic (snapshot and row deltas) goes latent (multi-KB). Latent events can arrive out of order, so each
 * carries a revision and the NUI keeps a row only when it is newer than what it has for that player.
 */
function sendList(admin: number, delta: PlayersDelta): void {
  TriggerLatentClientEvent(ADMIN_PLAYERS.deltaEvent, admin, LIST_BPS, delta);
}

/**
 * Admins with the Players screen open: the list watchers get the online rows that changed, a character's watchers
 * get that character's changes. The snapshot callbacks subscribe, the screen's close and `playerDropped` prune.
 * Nothing is collected while nobody watches.
 */
class PlayerWatchers {
  private readonly list = new Set<number>();
  private readonly byChar = new Map<number, Set<number>>();
  private readonly charOf = new Map<number, number>();
  private readonly dirty = new Set<number>();
  private readonly gone = new Set<number>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  /** Revision of list messages: a later message wins per player, whatever order they arrive in. */
  private rev = 0;

  /** Subscribes an admin to the online list and sends it as `rows` chunks of one revision (at least one chunk). */
  watchList(admin: number): void {
    this.list.add(admin);
    const rev = ++this.rev;
    let put: OnlineRow[] = [];
    let sent = false;
    for (const player of players.all()) {
      put.push(onlineRow(player));
      if (put.length < ROWS_PER_EVENT) continue;
      sendList(admin, { kind: "rows", rev, put, remove: [] });
      put = [];
      sent = true;
    }
    if (!sent || put.length > 0)
      sendList(admin, { kind: "rows", rev, put, remove: [] });
  }

  /** An admin watches one character at a time; opening another replaces it. */
  watchChar(admin: number, charId: number): void {
    this.unwatchChar(admin);
    this.charOf.set(admin, charId);
    let set = this.byChar.get(charId);
    if (!set) this.byChar.set(charId, (set = new Set()));
    set.add(admin);
  }

  unwatchChar(admin: number): void {
    const charId = this.charOf.get(admin);
    if (charId === undefined) return;
    this.charOf.delete(admin);
    const set = this.byChar.get(charId);
    set?.delete(admin);
    if (set?.size === 0) this.byChar.delete(charId);
  }

  unwatchList(admin: number): void {
    this.list.delete(admin);
  }

  drop(admin: number): void {
    this.unwatchList(admin);
    this.unwatchChar(admin);
  }

  watching(charId: number): boolean {
    return this.byChar.has(charId);
  }

  /** An online row changed or joined. */
  put(source: number): void {
    if (this.list.size === 0) return;
    this.gone.delete(source);
    this.dirty.add(source);
    this.schedule();
  }

  /** A player left the online list. */
  remove(source: number): void {
    if (this.list.size === 0) return;
    this.dirty.delete(source);
    this.gone.add(source);
    this.schedule();
  }

  char(charId: number, patch: Partial<CharacterView>): void {
    this.toChar(charId, { kind: "char", charId, patch });
  }

  money(charId: number, account: string, balance: number): void {
    this.toChar(charId, { kind: "money", charId, account, balance });
  }

  meta(charId: number, key: string, value: unknown): void {
    if (this.byChar.has(charId))
      this.toChar(charId, { kind: "meta", charId, key, value });
  }

  view(view: CharacterView): void {
    this.toChar(view.charId, { kind: "view", view });
  }

  deleted(charId: number): void {
    this.toChar(charId, { kind: "gone", charId });
  }

  private toChar(charId: number, delta: PlayersDelta): void {
    const set = this.byChar.get(charId);
    if (!set) return;
    for (const admin of set) emitNet(ADMIN_PLAYERS.deltaEvent, admin, delta);
  }

  private schedule(): void {
    this.timer ??= setTimeout(() => this.flush(), LIST_FLUSH_MS);
  }

  private flush(): void {
    this.timer = null;
    const put: OnlineRow[] = [];
    for (const source of this.dirty) {
      if (put.length >= ROWS_PER_EVENT) break;
      this.dirty.delete(source);
      const player = players.get(source);
      if (player) put.push(onlineRow(player));
      else this.gone.add(source);
    }
    const delta: PlayersDelta = {
      kind: "rows",
      rev: ++this.rev,
      put,
      remove: [...this.gone],
    };
    this.gone.clear();
    for (const admin of this.list) sendList(admin, delta);
    if (this.dirty.size > 0) this.schedule();
  }
}

export const playerWatchers = new PlayerWatchers();
