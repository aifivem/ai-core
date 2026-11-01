/**
 * Contract of the admin panel's ban screens (ai-core server <-> client <-> web): the Bans section and the Bans card
 * of a character. `list` and `history` answer a snapshot and subscribe the admin; changes arrive as `BansDelta`;
 * every other action answers `BansResult`.
 */

import type {
  BanCursor,
  BanFilter,
  BanIdentifier,
  BanRecord,
} from "@aicore-fivem/shared";

export const ADMIN_BANS = {
  /** Server -> admin client: (BansDelta), forwarded to the NUI while the panel is open. */
  deltaEvent: "ai-core:client:adminBans",
  /** Client -> server callback name of one action. */
  callback: (action: BansAction): string => `ai-core:adminBans:${action}`,
} as const;

/** Every server action of the ban screens; the client relays only these. */
export const BANS_ACTIONS = [
  "list",
  "history",
  "close",
  "ban",
  "unban",
  "edit",
] as const;
export type BansAction = (typeof BANS_ACTIONS)[number];

export const isBansAction = (value: unknown): value is BansAction =>
  typeof value === "string" &&
  (BANS_ACTIONS as readonly string[]).includes(value);

/** Who a ban from the panel hits: a character (its player while online, else its account's identifiers) or identifiers. */
export type BanSubject =
  { charId: number } | { identifiers: Partial<Record<BanIdentifier, string>> };

/** `list` answer: one page and the server's clock (the NUI shows states and time left on it). */
export interface BansListAnswer {
  bans: BanRecord[];
  next: BanCursor | null;
  now: number;
}

/** `history` answer: every ban of a character's account, newest first. */
export interface BansHistoryAnswer {
  bans: BanRecord[];
  now: number;
}

/** A ban was made, changed or lifted (an upsert by id; bans are never deleted). */
export type BansDelta = { kind: "put"; ban: BanRecord };

export type BansResult = { ok: true } | { ok: false; error: string };

export type { BanFilter };
