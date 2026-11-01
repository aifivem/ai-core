import { BAN_IDENTIFIERS } from "@aicore-fivem/shared";
import { mysql } from "@aicore-fivem/mysql";
import { Locale } from "common";
import { gate } from "../connection";
import { databaseReady } from "../database";
import { log } from "../log";
import { activeBans, refusal } from "./active";
import type { Identifiers } from "./store";

/**
 * Bans (`ai_core_bans`): the active ones are read once at start and kept in memory by identifier; the connection gate
 * checks every joining player against them without a query. Banning, changing and lifting change memory at once (the
 * gate and `IsBanned` see it), the row follows, and admins with a ban screen open get the ban (`watchers.ts`).
 * Logged on ai-core's `bans` channel.
 */

let loaded = false;

gate.add("ai-core:bans", "ai-core", (_source, identifiers) => {
  if (!loaded) return Locale("BAN_STARTING");
  const ban = activeBans.find(identifiers);
  return ban ? refusal(ban) : null;
});

interface BanRow {
  id: number;
  fivem: string | null;
  license: string | null;
  discord: string | null;
  ip: string | null;
  name: string;
  reason: string;
  banned_by: string;
  created_at: number;
  expires_at: number | null;
}

async function loadBans(): Promise<void> {
  await databaseReady;
  const rows =
    (await mysql.query<BanRow[]>(
      `SELECT id, fivem, license, discord, ip, name, reason, banned_by, created_at, expires_at FROM ai_core_bans
       WHERE revoked_at IS NULL AND (expires_at IS NULL OR expires_at > ?) ORDER BY id`,
      [new Date()],
    )) ?? [];
  for (const row of rows) {
    const identifiers: Identifiers = {};
    for (const type of BAN_IDENTIFIERS) {
      const value = row[type];
      if (value) identifiers[type] = value;
    }
    activeBans.add({
      id: row.id,
      identifiers,
      name: row.name,
      reason: row.reason,
      by: row.banned_by,
      created: row.created_at,
      expires: row.expires_at,
    });
  }
  loaded = true;
  log.info(`${activeBans.size} active bans`);
}

loadBans().catch((error: unknown) => {
  // Without the list nobody could be checked: let players in rather than lock the server.
  loaded = true;
  log.error("reading the bans failed: nobody is refused as banned", error);
});
