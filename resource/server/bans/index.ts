import { caller } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import {
  BAN_IDENTIFIERS,
  type BanInfo,
  type BansPage,
} from "@aicore-fivem/shared";
import { mysql } from "@aicore-fivem/mysql";
import { Locale } from "common";
import { actorName } from "../characters/manage";
import { gate } from "../connection";
import { databaseReady } from "../database";
import { log } from "../log";
import { coreLog } from "../logs";
import { BanStore, copyBan, type Identifiers } from "./store";

/**
 * Bans (`ai_core_bans`): the active ones are read once at start and kept in memory by identifier; the connection gate
 * checks every joining player against them without a query. Banning and lifting change memory at once (the gate and
 * `IsBanned` see it), the row follows. Logged on ai-core's `bans` channel.
 */

const store = new BanStore();
let loaded = false;

/** Longest stored value per identifier type (the table's column sizes). */
const MAX_LENGTH: Record<(typeof BAN_IDENTIFIERS)[number], number> = {
  fivem: 20,
  license: 60,
  discord: 30,
  ip: 45,
};

/** A source's identifiers as the gate sees them (`type` -> value without the prefix). */
function identifiersOf(source: number): Identifiers {
  const out: Identifiers = {};
  for (const id of getPlayerIdentifiers(String(source))) {
    const at = id.indexOf(":");
    const type = id.slice(0, at);
    if (at > 0 && (BAN_IDENTIFIERS as readonly string[]).includes(type))
      out[type as keyof Identifiers] = id.slice(at + 1);
  }
  return out;
}

/** Identifiers from another resource: `license: "license:abc"` or `license: "abc"`; null when none is usable. */
function readIdentifiers(raw: unknown): Identifiers | null {
  if (!isRecord(raw)) return null;
  const out: Identifiers = {};
  let any = false;
  for (const type of BAN_IDENTIFIERS) {
    const value = raw[type];
    if (typeof value !== "string") continue;
    const text = value.trim().replace(new RegExp(`^${type}:`), "");
    if (!text || text.length > MAX_LENGTH[type]) continue;
    out[type] = text;
    any = true;
  }
  return any ? out : null;
}

/** A target: an online player's server id or `{ identifiers }`. */
function readTarget(
  target: unknown,
): { identifiers: Identifiers; source: number | null } | null {
  if (typeof target === "number" && Number.isInteger(target) && target > 0) {
    if (!GetPlayerName(String(target))) return null;
    const identifiers = identifiersOf(target);
    return Object.keys(identifiers).length > 0
      ? { identifiers, source: target }
      : null;
  }
  if (isRecord(target)) {
    const identifiers = readIdentifiers(target.identifiers);
    return identifiers ? { identifiers, source: null } : null;
  }
  return null;
}

const pad = (n: number): string => String(n).padStart(2, "0");
/** Server local time `YYYY-MM-DD HH:MM`, or the permanent text. */
function expiryText(expires: number | null): string {
  if (expires === null) return Locale("BAN_PERMANENT");
  const d = new Date(expires);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const refusal = (ban: BanInfo): string =>
  Locale("BAN_REFUSED", ban.reason, expiryText(ban.expires), ban.id || "-");

gate.add("ai-core:bans", "ai-core", (_source, identifiers) => {
  if (!loaded) return Locale("BAN_STARTING");
  const ban = store.find(identifiers);
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
    store.add({
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
  log.info(`${store.size} active bans`);
}

loadBans().catch((error: unknown) => {
  // Without the list nobody could be checked: let players in rather than lock the server.
  loaded = true;
  log.error("reading the bans failed: nobody is refused as banned", error);
});

/** Bans an online player (dropped at once) or identifiers; the row follows. Null on wrong arguments. */
export function banPlayer(
  target: unknown,
  reason: unknown,
  minutes: unknown,
  by: unknown,
  done: unknown,
): boolean {
  const who = actorName(by, caller());
  const found = readTarget(target);
  const why = typeof reason === "string" ? reason.trim().slice(0, 255) : "";
  const mins =
    minutes == null
      ? null
      : typeof minutes === "number" && Number.isInteger(minutes) && minutes > 0
        ? minutes
        : undefined;
  if (!found || !why || mins === undefined) return false;
  const now = Date.now();
  const ban: BanInfo = {
    id: 0,
    identifiers: found.identifiers,
    name: found.source
      ? (GetPlayerName(String(found.source)) || "").slice(0, 64)
      : "",
    reason: why,
    by: who,
    created: now,
    expires: mins === null ? null : now + mins * 60_000,
  };
  store.add(ban);
  // Everyone online who matches goes (one player, or every account behind the identifiers).
  for (const id of getPlayers()) {
    const source = Number(id);
    const ids = identifiersOf(source);
    if (
      BAN_IDENTIFIERS.some(
        (t) => ban.identifiers[t] && ids[t] === ban.identifiers[t],
      )
    )
      DropPlayer(String(source), refusal(ban));
  }
  coreLog(
    "bans",
    `banned ${ban.name || JSON.stringify(ban.identifiers)}: ${why}`,
    {
      level: "warn",
      metadata: { ...ban.identifiers, reason: why, minutes: mins, by: who },
    },
  );
  const ids = ban.identifiers;
  mysql
    .insert(
      `INSERT INTO ai_core_bans (fivem, license, discord, ip, name, reason, banned_by, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ids.fivem ?? null,
        ids.license ?? null,
        ids.discord ?? null,
        ids.ip ?? null,
        ban.name,
        why,
        who,
        new Date(now),
        ban.expires === null ? null : new Date(ban.expires),
      ],
    )
    .then(
      (id) => {
        if (id) store.written(ban, id);
        return id || null;
      },
      (error: unknown) => {
        log.error("writing a ban failed (it holds until a restart)", error);
        return null;
      },
    )
    .then((id) => {
      if (typeof done === "function") (done as (id: number | null) => void)(id);
    })
    .catch((error: unknown) => log.error("ban callback failed", error));
  return true;
}

/** Lifts an active ban by id (memory at once, the row follows). */
export function unbanPlayer(banId: unknown, by: unknown): boolean {
  const who = actorName(by, caller());
  const ban =
    typeof banId === "number" && Number.isInteger(banId) && banId > 0
      ? store.get(banId)
      : undefined;
  if (!ban) return false;
  store.remove(ban);
  coreLog("bans", `lifted ban #${ban.id} (${ban.name || ban.reason})`, {
    metadata: { banId: ban.id, by: who },
  });
  mysql
    .update(
      "UPDATE ai_core_bans SET revoked_at = ?, revoked_by = ? WHERE id = ? AND revoked_at IS NULL",
      [new Date(), who, ban.id],
    )
    .catch((error: unknown) =>
      log.error(`lifting ban #${ban.id} failed`, error),
    );
  return true;
}

export function isBanned(target: unknown): BanInfo | null {
  const found = readTarget(target);
  const ban = found ? store.find(found.identifiers) : null;
  return ban ? copyBan(ban) : null;
}

export function getBans(page: unknown): BansPage {
  return store.page(
    typeof page === "number" && Number.isInteger(page) ? page : 1,
  );
}
