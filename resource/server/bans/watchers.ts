import { PlayerMap } from "@aicore-fivem/lib/server";
import { BAN_IDENTIFIERS, type BanRecord } from "@aicore-fivem/shared";
import { ADMIN_BANS, type BansDelta } from "common/adminBans";
import type { Identifiers } from "./store";

/**
 * Admins with a ban screen open: the Bans section gets every ban that changes, a character's Bans card only the
 * bans matching that account's identifiers. The snapshot callbacks subscribe, the screen's close and a drop free
 * them. Ban changes are rare (an admin's or a script's action), so each goes out at once.
 */
class BanWatchers {
  private readonly lists = new PlayerMap<true>();
  private readonly histories = new PlayerMap<Identifiers>();

  watchList(admin: number): void {
    this.lists.set(admin, true);
  }

  watchHistory(admin: number, identifiers: Identifiers): void {
    this.histories.set(admin, identifiers);
  }

  stop(admin: number): void {
    this.lists.delete(admin);
    this.histories.delete(admin);
  }

  /** A ban was made, changed or lifted. */
  put(ban: BanRecord): void {
    if (this.lists.size === 0 && this.histories.size === 0) return;
    const delta: BansDelta = { kind: "put", ban };
    for (const admin of this.lists.keys())
      emitNet(ADMIN_BANS.deltaEvent, admin, delta);
    for (const [admin, ids] of this.histories)
      if (
        !this.lists.has(admin) &&
        BAN_IDENTIFIERS.some(
          (t) => ban.identifiers[t] && ids[t] === ban.identifiers[t],
        )
      )
        emitNet(ADMIN_BANS.deltaEvent, admin, delta);
  }
}

export const banWatchers = new BanWatchers();
