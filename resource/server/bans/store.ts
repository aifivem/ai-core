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

  get size(): number {
    return this.all.size;
  }

  add(ban: BanInfo): void {
    if (ban.id > 0 && this.byId.has(ban.id)) return;
    this.all.add(ban);
    if (ban.id > 0) this.byId.set(ban.id, ban);
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
    if (this.all.has(ban)) this.byId.set(id, ban);
  }

  remove(ban: BanInfo): void {
    if (!this.all.delete(ban)) return;
    if (ban.id > 0 && this.byId.get(ban.id) === ban) this.byId.delete(ban.id);
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
