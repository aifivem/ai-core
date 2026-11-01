/** The contract of vRP's key-value data (`store.ts`): key kinds, rows and the injected database backend. */

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
