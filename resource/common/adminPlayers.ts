/**
 * Contract of the admin panel's Players section (ai-core server <-> client <-> web). Snapshots answer the `online`
 * and `open` callbacks (and subscribe the admin), changes arrive as `PlayersDelta`, every other action answers
 * `PlayersResult`.
 */

import type { GangMembership, JobMembership, Sex } from "@aicore-fivem/shared";

export const ADMIN_PLAYERS = {
  /** Server -> admin client: (PlayersDelta), forwarded to the NUI while the panel is open. */
  deltaEvent: "ai-core:client:adminPlayers",
  /** Server -> client: ({ x, y, z, heading? }) teleport (goto for the admin, bring for the target). */
  teleportEvent: "ai-core:client:adminTeleport",
  /** Client -> server callback name of one action. */
  callback: (action: PlayersAction): string => `ai-core:adminPlayers:${action}`,
} as const;

/** Every server action of the section; the client relays only these. */
export const PLAYERS_ACTIONS = [
  "online",
  "search",
  "open",
  "close",
  "info",
  "money",
  "job",
  "removeJob",
  "duty",
  "gang",
  "removeGang",
  "activeGang",
  "meta",
  "goto",
  "bring",
  "kick",
  "revive",
  "item",
  "inventory",
  "delete",
] as const;
export type PlayersAction = (typeof PLAYERS_ACTIONS)[number];

export const isPlayersAction = (value: unknown): value is PlayersAction =>
  typeof value === "string" &&
  (PLAYERS_ACTIONS as readonly string[]).includes(value);

/** Search results per page. */
export const SEARCH_PAGE = 25;

export interface Position {
  x: number;
  y: number;
  z: number;
  heading: number;
}

/** One online player with a loaded character (the list's first part). */
export interface OnlineRow {
  source: number;
  charId: number;
  citizenid: string;
  name: string;
  /** The FiveM account name. */
  account: string;
  job: string;
  grade: number;
  duty: boolean;
}

/** One stored character found by the search. */
export interface StoredRow {
  charId: number;
  citizenid: string;
  name: string;
  account: string;
  /** Epoch ms, null: never played. */
  lastPlayed: number | null;
  /** Server id while online. */
  source: number | null;
}

/** A search answer: `next` is the cursor of the following page (null: last page). */
export interface SearchPage {
  rows: StoredRow[];
  next: number | null;
}

/** Everything ai-core holds about one character, as the detail screen shows it. */
export interface CharacterView {
  charId: number;
  citizenid: string;
  slot: number;
  firstname: string;
  lastname: string;
  birthdate: string;
  sex: Sex;
  user: {
    id: number;
    fivem: string;
    license: string | null;
    discord: string | null;
    name: string;
  };
  /** Server id while online. */
  source: number | null;
  money: Record<string, number>;
  jobs: JobMembership[];
  duty: string | null;
  gangs: GangMembership[];
  activeGang: string | null;
  metadata: Record<string, unknown>;
  /** As of the snapshot (online: the ped, offline: where the character spawns next). */
  position: Position | null;
  lastPlayed: number | null;
}

export type PlayersDelta =
  /** Online rows that changed or joined, and server ids that left (one batch per second). */
  | { kind: "rows"; put: OnlineRow[]; remove: number[] }
  /** Fields of the watched character that changed. */
  | { kind: "char"; charId: number; patch: Partial<CharacterView> }
  | { kind: "money"; charId: number; account: string; balance: number }
  /** A metadata key changed (null: removed). */
  | { kind: "meta"; charId: number; key: string; value: unknown }
  /** The watched character loaded or unloaded: its fresh snapshot. */
  | { kind: "view"; view: CharacterView }
  /** The watched character was deleted. */
  | { kind: "gone"; charId: number };

export type PlayersResult = { ok: true } | { ok: false; error: string };

export type MoneyMode = "add" | "remove" | "set";
