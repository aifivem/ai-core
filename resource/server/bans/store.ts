import {
  BAN_IDENTIFIERS,
  type BanIdentifier,
  type BanInfo,
  type BansPage,
} from "@aicore-fivem/shared";

export type Identifiers = Partial<Record<BanIdentifier, string>>;

const PAGE_SIZE = 50;

/**
 * The active bans in memory: every ban by id and by each of its identifiers (`license:abc`), so the connection gate
 * checks a player with at most four map reads. Expired bans are dropped when a check meets them.
 */
export class BanStore {
  /** Every active ban, in the order they were made (oldest first). */
  private readonly all = new Set<BanInfo>();
  private readonly byId = new Map<number, BanInfo>();
  private readonly byIdentifier = new Map<string, Set<BanInfo>>();
  /**
   * Written bans by id ascending, for the newest-first keyset list. Lifted bans stay until more than half of the
   * array is dead (walks skip what `all` no longer holds), so a lift never shifts a million-entry array.
   */
  private sorted: BanInfo[] = [];
  private dead = 0;

  get size(): number {
    return this.all.size;
  }

  add(ban: BanInfo): void {
    if (ban.id > 0 && this.byId.has(ban.id)) return;
    this.all.add(ban);
    if (ban.id > 0) {
      this.byId.set(ban.id, ban);
      this.insertSorted(ban);
    }
    for (const type of BAN_IDENTIFIERS) {
      const value = ban.identifiers[type];
      if (!value) continue;
      const key = `${type}:${value}`;
      let set = this.byIdentifier.get(key);
      if (!set) this.byIdentifier.set(key, (set = new Set()));
      set.add(ban);
    }
  }

  /** A ban written to the DB gets its id (a copy read meanwhile with that id is dropped). */
  written(ban: BanInfo, id: number): void {
    const copy = this.byId.get(id);
    if (copy && copy !== ban) this.remove(copy);
    ban.id = id;
    if (!this.all.has(ban)) return;
    this.byId.set(id, ban);
    this.insertSorted(ban);
  }

  remove(ban: BanInfo): void {
    if (!this.all.delete(ban)) return;
    if (ban.id > 0 && this.byId.get(ban.id) === ban) this.byId.delete(ban.id);
    if (ban.id > 0 && ++this.dead > this.sorted.length / 2) {
      this.sorted = this.sorted.filter((b) => this.all.has(b));
      this.dead = 0;
    }
    for (const type of BAN_IDENTIFIERS) {
      const value = ban.identifiers[type];
      if (!value) continue;
      const key = `${type}:${value}`;
      const set = this.byIdentifier.get(key);
      set?.delete(ban);
      if (set?.size === 0) this.byIdentifier.delete(key);
    }
  }

  get(id: number): BanInfo | undefined {
    return this.byId.get(id);
  }

  /** The first active ban matching any identifier; expired ones met on the way are dropped. */
  find(identifiers: Identifiers, now = Date.now()): BanInfo | null {
    for (const type of BAN_IDENTIFIERS) {
      const value = identifiers[type];
      if (!value) continue;
      const set = this.byIdentifier.get(`${type}:${value}`);
      if (!set) continue;
      for (const ban of set) {
        if (ban.expires !== null && ban.expires <= now) {
          this.remove(ban);
          continue;
        }
        return ban;
      }
    }
    return null;
  }

  /**
   * Active written bans with an id below `before`, newest first, at most `limit` (expired ones met on the way are
   * dropped). One binary search plus a walk over the page: the cost does not grow with the number of bans.
   */
  before(before: number, limit: number, now = Date.now()): BanInfo[] {
    const out: BanInfo[] = [];
    const expired: BanInfo[] = [];
    for (let i = this.indexBelow(before); i >= 0 && out.length < limit; i--) {
      const ban = this.sorted[i];
      if (!ban || !this.all.has(ban)) continue;
      if (ban.expires !== null && ban.expires <= now) expired.push(ban);
      else out.push(ban);
    }
    for (const ban of expired) this.remove(ban);
    return out;
  }

  /** Index of the last entry with an id below `id` (-1: none). */
  private indexBelow(id: number): number {
    let lo = 0;
    let hi = this.sorted.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if ((this.sorted[mid]?.id ?? 0) < id) lo = mid + 1;
      else hi = mid;
    }
    return lo - 1;
  }

  /** Ids arrive in order (start read, then AUTO_INCREMENT), so this is a push; an out-of-order write is placed. */
  private insertSorted(ban: BanInfo): void {
    const last = this.sorted.at(-1);
    if (!last || last.id < ban.id) this.sorted.push(ban);
    else this.sorted.splice(this.indexBelow(ban.id) + 1, 0, ban);
  }

  /** Active bans newest first, `PAGE_SIZE` per page (page 1 first). */
  page(page: number, now = Date.now()): BansPage {
    for (const ban of this.all)
      if (ban.expires !== null && ban.expires <= now) this.remove(ban);
    const list = [...this.all].reverse();
    const start = (Math.max(1, page) - 1) * PAGE_SIZE;
    return {
      bans: list.slice(start, start + PAGE_SIZE).map(copyBan),
      total: list.length,
    };
  }
}

/** Exports copy their data: a fresh object, never the stored one. */
export function copyBan(ban: BanInfo): BanInfo {
  return { ...ban, identifiers: { ...ban.identifiers } };
}
