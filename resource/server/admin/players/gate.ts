import { isAdmin, onClientCallback } from "@aicore-fivem/lib/server";
import {
  ADMIN_PLAYERS,
  type PlayersAction,
  type PlayersResult,
} from "common/adminPlayers";
import { coreLog } from "../../logs";
import type { Player } from "../../player/player";
import { claims, players } from "../../player/registry";
import { fail } from "./offline";
import { characterExists } from "./repo";

/** Argument parsers of the section's callbacks (every value from the admin's client passes one). */
export const parse = {
  charId: (v: unknown): number | null =>
    typeof v === "number" && Number.isInteger(v) && v > 0 && v < 2 ** 32
      ? v
      : null,
  /** A job, gang, account or item name. */
  name: (v: unknown): string | null =>
    typeof v === "string" && /^[A-Za-z0-9_-]{1,48}$/.test(v) ? v : null,
  int: (v: unknown, min: number, max: number): number | null =>
    typeof v === "number" && Number.isSafeInteger(v) && v >= min && v <= max
      ? v
      : null,
  text: (v: unknown, min: number, max: number): string | null => {
    if (typeof v !== "string") return null;
    const text = v.trim();
    return text.length >= min && text.length <= max ? text : null;
  },
};

/** Edits per admin: the panel's limit for every write. */
const WRITE_RATE = { count: 30, windowMs: 10_000 };

/** One action as its own admin-only callback; the parser returns the handler's arguments or null (refused). */
export function action<const A extends readonly unknown[]>(
  name: PlayersAction,
  args: (raw: unknown[]) => A | null,
  handler: (source: number, ...args: A) => unknown,
): void {
  onClientCallback(
    ADMIN_PLAYERS.callback(name),
    { guards: [isAdmin()], rate: WRITE_RATE, args },
    handler,
  );
}

export const BUSY = fail("ADMIN_PLAYERS_ERR_BUSY");
export const GONE = fail("ADMIN_PLAYERS_ERR_GONE");
export const OFFLINE = fail("ADMIN_PLAYERS_ERR_OFFLINE");

/**
 * Runs an edit on the loaded character, or on the stored one while it is held (it cannot load meanwhile; a
 * character that is loading or saving on unload answers busy). `offline` null: the edit needs the player online.
 */
export async function onCharacter(
  charId: number,
  online: (player: Player) => PlayersResult | Promise<PlayersResult>,
  offline: (() => Promise<PlayersResult>) | null,
): Promise<PlayersResult> {
  const player = players.byCharacter(charId);
  if (player) return online(player);
  if (!offline) return OFFLINE;
  return claims.run(charId, BUSY, async () => {
    if (players.byCharacter(charId)) return BUSY;
    if (!(await characterExists(charId))) return GONE;
    return offline();
  });
}

/** The ledger's actor for an admin's money change. */
export function actorOf(admin: number): string {
  const fivem = players.get(admin)?.user.fivem;
  return fivem ? `admin fivem:${fivem}` : `admin ${admin}`;
}

/** Logs a successful edit on ai-core's `admin` channel (target = the character's player while online). */
export function logEdit(
  admin: number,
  charId: number,
  message: string,
  metadata: Record<string, unknown> = {},
  level: "info" | "warn" = "info",
): void {
  coreLog("admin", `players: ${message} (character #${charId})`, {
    level,
    source: admin,
    target: players.byCharacter(charId)?.source,
    metadata: { charId, ...metadata },
  });
}
