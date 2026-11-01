import type { VrpKind, VrpStoreOptions } from "./data";

/** The cached keys of `VrpStore`, indexed by key and by `c` / `u` owner. */

export class Entry {
  constructor(
    readonly kind: VrpKind,
    readonly owner: string,
    readonly key: string,
    public hex: string,
  ) {}
}

export const fullKey = (kind: string, owner: string, key: string): string =>
  `${kind}\u0000${owner}\u0000${key}`;
export const ownerKey = (kind: string, owner: string): string =>
  `${kind}\u0000${owner}`;

export class VrpCache {
  protected readonly entries = new Map<string, Entry>();
  /** `c` / `u` owner -> its cached keys. */
  protected readonly byOwner = new Map<string, Set<string>>();

  constructor(protected readonly options: VrpStoreOptions) {}

  get size(): number {
    return this.entries.size;
  }

  protected kept(kind: VrpKind, owner: string): boolean {
    return kind === "s" || kind === "g" || this.options.isLive(kind, owner);
  }

  protected remember(entry: Entry, id: string): void {
    this.entries.set(id, entry);
    if (entry.kind !== "c" && entry.kind !== "u") return;
    const ok = ownerKey(entry.kind, entry.owner);
    let keys = this.byOwner.get(ok);
    if (!keys) {
      keys = new Set();
      this.byOwner.set(ok, keys);
    }
    keys.add(id);
  }

  protected forget(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    this.entries.delete(id);
    const ok = ownerKey(entry.kind, entry.owner);
    const keys = this.byOwner.get(ok);
    if (!keys) return;
    keys.delete(id);
    if (keys.size === 0) this.byOwner.delete(ok);
  }
}
