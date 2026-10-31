/**
 * vRP's key-value data (`ai_core_vrp_data`) in memory: read through, written behind. Values are hex text (the Lua side
 * hex-encodes, so any bytes survive msgpack). Loaded characters' and accounts' keys and every server / global key stay
 * cached; a read for an owner that is not loaded is answered without caching it. Pure: the database is the injected
 * backend (bench `bench/vrpStore.bench.ts` runs it with a stub).
 */

export type VrpKind = "c" | "u" | "s" | "g";

export const isVrpKind = (value: unknown): value is VrpKind =>
  value === "c" || value === "u" || value === "s" || value === "g";

export interface VrpRow {
  kind: VrpKind;
  owner: string;
  key: string;
  hex: string;
}

export interface VrpBackend {
  /** The stored value as hex, or null when the key is not stored. */
  read(kind: VrpKind, owner: string, key: string): Promise<string | null>;
  /** Upserts the rows (the store hands at most `chunk` rows per call). */
  write(rows: VrpRow[]): Promise<void>;
}

class Entry {
  constructor(
    readonly kind: VrpKind,
    readonly owner: string,
    readonly key: string,
    public hex: string,
  ) {}
}

const fullKey = (kind: string, owner: string, key: string): string =>
  `${kind}\u0000${owner}\u0000${key}`;
const ownerKey = (kind: string, owner: string): string =>
  `${kind}\u0000${owner}`;

export interface VrpStoreOptions {
  backend: VrpBackend;
  /** Whether the owner of a `c` / `u` key is loaded (its keys stay cached). */
  isLive: (kind: VrpKind, owner: string) => boolean;
  /** Called when a write is wanted; the caller runs `flush()` soon (one timer). */
  onDirty?: () => void;
  onError?: (what: string, error: unknown) => void;
  /** Rows per write call. */
  chunk?: number;
  /** Hex characters per write call (values can be large: MEDIUMBLOB). */
  chunkBytes?: number;
}

export class VrpStore {
  private readonly entries = new Map<string, Entry>();
  private readonly dirty = new Set<string>();
  /** `c` / `u` owner -> its cached keys. */
  private readonly byOwner = new Map<string, Set<string>>();
  /** Owners whose clean keys go once their dirty ones are written (released, or never loaded). */
  private readonly releasing = new Map<string, [VrpKind, string]>();
  private readonly reading = new Map<string, Array<(hex: string) => void>>();
  private running: Promise<void> | null = null;
  private again = false;
  private readonly chunk: number;
  private readonly chunkBytes: number;

  constructor(private readonly options: VrpStoreOptions) {
    this.chunk = options.chunk ?? 500;
    this.chunkBytes = options.chunkBytes ?? 4_000_000;
  }

  get size(): number {
    return this.entries.size;
  }

  get pending(): number {
    return this.dirty.size;
  }

  private kept(kind: VrpKind, owner: string): boolean {
    return kind === "s" || kind === "g" || this.options.isLive(kind, owner);
  }

  private remember(entry: Entry, id: string): void {
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

  private forget(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    this.entries.delete(id);
    const ok = ownerKey(entry.kind, entry.owner);
    const keys = this.byOwner.get(ok);
    if (!keys) return;
    keys.delete(id);
    if (keys.size === 0) this.byOwner.delete(ok);
  }

  /** The value as hex (`""` when unset); `done` runs at once on a cached key. */
  get(
    kind: VrpKind,
    owner: string,
    key: string,
    done: (hex: string) => void,
  ): void {
    const id = fullKey(kind, owner, key);
    const entry = this.entries.get(id);
    if (entry) return done(entry.hex);
    const waiting = this.reading.get(id);
    if (waiting) {
      waiting.push(done);
      return;
    }
    const list = [done];
    this.reading.set(id, list);
    this.options.backend
      .read(kind, owner, key)
      .then(
        (hex) => {
          // A write while the read ran wins.
          const now = this.entries.get(id);
          if (now) return now.hex;
          const value = hex ?? "";
          if (this.kept(kind, owner))
            this.remember(new Entry(kind, owner, key, value), id);
          return value;
        },
        (error: unknown) => {
          this.options.onError?.(`reading ${kind}/${owner}/${key}`, error);
          return this.entries.get(id)?.hex ?? "";
        },
      )
      .then((value) => {
        this.reading.delete(id);
        for (const fn of list) fn(value);
      });
  }

  /** Stores a value; it is written with the next flush. */
  set(kind: VrpKind, owner: string, key: string, hex: string): void {
    const id = fullKey(kind, owner, key);
    const entry = this.entries.get(id);
    if (entry) {
      if (entry.hex === hex && !this.dirty.has(id)) return;
      entry.hex = hex;
    } else {
      this.remember(new Entry(kind, owner, key, hex), id);
      if (!this.kept(kind, owner))
        this.releasing.set(ownerKey(kind, owner), [kind, owner]);
    }
    if (this.dirty.size === 0) this.options.onDirty?.();
    this.dirty.add(id);
  }

  /** Drops an owner's keys (character unloaded); dirty ones go after the next flush writes them. */
  release(kind: VrpKind, owner: string): void {
    const ok = ownerKey(kind, owner);
    const keys = this.byOwner.get(ok);
    if (!keys) return;
    for (const id of [...keys]) if (!this.dirty.has(id)) this.forget(id);
    if (this.byOwner.has(ok)) this.releasing.set(ok, [kind, owner]);
  }

  /** Writes every dirty key (one write in flight; a call during a flush runs one more after it). */
  flush(): Promise<void> {
    if (this.running) {
      this.again = true;
      return this.running;
    }
    this.running = this.flushLoop().finally(() => {
      this.running = null;
    });
    return this.running;
  }

  private async flushLoop(): Promise<void> {
    let ok = true;
    do {
      this.again = false;
      ok = await this.flushOnce();
    } while (ok && (this.again || this.dirty.size > 0));
  }

  /** False when a write failed: the rest stays dirty for the next flush (no retry loop against a down database). */
  private async flushOnce(): Promise<boolean> {
    if (this.dirty.size === 0) return true;
    const taken: Array<{ id: string; entry: Entry }> = [];
    for (const id of this.dirty) {
      const entry = this.entries.get(id);
      if (entry) taken.push({ id, entry });
    }
    this.dirty.clear();
    let start = 0;
    while (start < taken.length) {
      let end = start;
      let bytes = 0;
      while (
        end < taken.length &&
        end - start < this.chunk &&
        (end === start ||
          bytes + (taken[end]?.entry.hex.length ?? 0) <= this.chunkBytes)
      ) {
        bytes += taken[end]?.entry.hex.length ?? 0;
        end++;
      }
      const part = taken.slice(start, end);
      try {
        await this.options.backend.write(
          part.map(({ entry }) => ({
            kind: entry.kind,
            owner: entry.owner,
            key: entry.key,
            hex: entry.hex,
          })),
        );
      } catch (error) {
        this.options.onError?.(`writing ${part.length} keys`, error);
        for (const { id } of taken.slice(start)) this.dirty.add(id);
        this.options.onDirty?.();
        return false;
      }
      start = end;
    }
    this.sweep();
    return true;
  }

  /** Clean keys of released owners go. */
  private sweep(): void {
    for (const [ok, [kind, owner]] of [...this.releasing]) {
      // Loaded again before its keys went: they stay.
      if (this.options.isLive(kind, owner)) {
        this.releasing.delete(ok);
        continue;
      }
      const keys = this.byOwner.get(ok);
      if (keys)
        for (const id of [...keys]) if (!this.dirty.has(id)) this.forget(id);
      if (!this.byOwner.has(ok)) this.releasing.delete(ok);
    }
  }
}
