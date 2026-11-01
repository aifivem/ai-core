import {
  ADMIN_PLAYERS,
  type OnlineRow,
  type PlayersDelta,
} from "common/adminPlayers";
import type { Player } from "../../player/player";
import { players } from "../../player/registry";
import { PlayerMap } from "@aicore-fivem/lib/server";

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
 * Admins with the Players screen's online list open: they get the online rows that changed. The `online` snapshot
 * subscribes, the screen's close prunes, a drop frees it. Nothing is collected while nobody watches.
 */
class ListWatchers {
  /** Admins with the online list open (freed on drop). */
  private readonly list = new PlayerMap<true>();
  private readonly dirty = new Set<number>();
  private readonly gone = new Set<number>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  /** Revision of list messages: a later message wins per player, whatever order they arrive in. */
  private rev = 0;

  /** Subscribes an admin to the online list and sends it as `rows` chunks of one revision (at least one chunk). */
  watchList(admin: number): void {
    this.list.set(admin, true);
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

  unwatchList(admin: number): void {
    this.list.delete(admin);
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
    for (const admin of this.list.keys()) sendList(admin, delta);
    if (this.dirty.size > 0) this.schedule();
  }
}

export const listWatchers = new ListWatchers();
