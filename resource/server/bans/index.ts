import { caller } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import {
  BAN_IDENTIFIERS,
  type BanInfo,
  type BanListPage,
  type BanRecord,
  type BansPage,
} from "@aicore-fivem/shared";
import { mysql } from "@aicore-fivem/mysql";
import { Locale } from "common";
import { actorName } from "../characters/manage";
import { gate } from "../connection";
import { databaseReady } from "../database";
import { log } from "../log";
import { coreLog } from "../logs";
import {
  historyOf,
  listBans,
  readBanQuery,
  recordOf,
  type ParsedBanQuery,
} from "./query";
import { BanStore, copyBan, type Identifiers } from "./store";
import { identifiersOf, readTarget, type BanTargetFound } from "./targets";
import { banWatchers } from "./watchers";

/**
 * Bans (`ai_core_bans`): the active ones are read once at start and kept in memory by identifier; the connection gate
 * checks every joining player against them without a query. Banning, changing and lifting change memory at once (the
 * gate and `IsBanned` see it), the row follows, and admins with a ban screen open get the ban (`watchers.ts`).
 * Logged on ai-core's `bans` channel.
 */

const store = new BanStore();
let loaded = false;

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

/** Minutes of a ban: undefined = wrong, null = permanent (at most 100 years). */
export function readMinutes(minutes: unknown): number | null | undefined {
  if (minutes == null) return null;
  return typeof minutes === "number" &&
    Number.isInteger(minutes) &&
    minutes > 0 &&
    minutes <= 52_560_000
    ? minutes
    : undefined;
}

export const readReason = (reason: unknown): string =>
  typeof reason === "string" ? reason.trim().slice(0, 255) : "";

/** The admin's server id for a log line, when `by` is one. */
const adminOf = (by: unknown): number | undefined =>
  typeof by === "number" && by > 0 ? by : undefined;

/**
 * Makes a ban: memory at once (matching online players dropped), the row follows, then the admin screens get it.
 * `name` is the player's name kept with it (an online player's FiveM name when left out).
 */
export function createBan(
  target: BanTargetFound,
  reason: string,
  minutes: number | null,
  by: unknown,
  options: { name?: string; done?: (id: number | null) => void } = {},
): void {
  const who = actorName(by, caller());
  const now = Date.now();
  const ban: BanInfo = {
    id: 0,
    identifiers: target.identifiers,
    name: (
      options.name ??
      (target.source ? GetPlayerName(String(target.source)) || "" : "")
    ).slice(0, 64),
    reason,
    by: who,
    created: now,
    expires: minutes === null ? null : now + minutes * 60_000,
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
    `banned ${ban.name || JSON.stringify(ban.identifiers)}: ${reason}`,
    {
      level: "warn",
      source: adminOf(by),
      metadata: { ...ban.identifiers, reason, minutes, by: who },
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
        reason,
        who,
        new Date(now),
        ban.expires === null ? null : new Date(ban.expires),
      ],
    )
    .then(
      (id) => {
        if (!id) return null;
        store.written(ban, id);
        banWatchers.put(recordOf(ban));
        return id;
      },
      (error: unknown) => {
        log.error("writing a ban failed (it holds until a restart)", error);
        return null;
      },
    )
    .then((id) => options.done?.(id))
    .catch((error: unknown) => log.error("ban callback failed", error));
}

/** Bans an online player (dropped at once) or identifiers; the row follows. False on wrong arguments. */
export function banPlayer(
  target: unknown,
  reason: unknown,
  minutes: unknown,
  by: unknown,
  done: unknown,
): boolean {
  const found = readTarget(target);
  const why = readReason(reason);
  const mins = readMinutes(minutes);
  if (!found || !why || mins === undefined) return false;
  createBan(found, why, mins, by, {
    done:
      typeof done === "function"
        ? (done as (id: number | null) => void)
        : undefined,
  });
  return true;
}

/** The active ban with this id (not yet expired). */
function activeBan(banId: unknown, now: number): BanInfo | undefined {
  const ban =
    typeof banId === "number" && Number.isInteger(banId) && banId > 0
      ? store.get(banId)
      : undefined;
  return ban && (ban.expires === null || ban.expires > now) ? ban : undefined;
}

/** Lifts an active ban by id (memory at once, the row follows). */
export function unbanPlayer(banId: unknown, by: unknown): boolean {
  const now = Date.now();
  const ban = activeBan(banId, now);
  if (!ban) return false;
  const who = actorName(by, caller());
  store.remove(ban);
  coreLog("bans", `lifted ban #${ban.id} (${ban.name || ban.reason})`, {
    source: adminOf(by),
    metadata: { banId: ban.id, by: who },
  });
  banWatchers.put(recordOf(ban, now, who));
  mysql
    .update(
      "UPDATE ai_core_bans SET revoked_at = ?, revoked_by = ? WHERE id = ? AND revoked_at IS NULL",
      [new Date(now), who, ban.id],
    )
    .catch((error: unknown) =>
      log.error(`lifting ban #${ban.id} failed`, error),
    );
  return true;
}

/** Changes an active ban's reason and / or end (`minutes` from now, null = permanent); memory at once, the row follows. */
export function editBan(banId: unknown, edit: unknown, by: unknown): boolean {
  const now = Date.now();
  const ban = activeBan(banId, now);
  if (!ban || !isRecord(edit)) return false;
  const reason =
    edit.reason === undefined ? ban.reason : readReason(edit.reason);
  const minutes =
    edit.minutes === undefined ? undefined : readMinutes(edit.minutes);
  if (!reason || (edit.minutes !== undefined && minutes === undefined))
    return false;
  const expires =
    minutes === undefined
      ? ban.expires
      : minutes === null
        ? null
        : now + minutes * 60_000;
  if (reason === ban.reason && expires === ban.expires) return true;
  const who = actorName(by, caller());
  const before = { reason: ban.reason, expires: ban.expires };
  ban.reason = reason;
  ban.expires = expires;
  coreLog("bans", `changed ban #${ban.id} (${ban.name || reason})`, {
    source: adminOf(by),
    metadata: { banId: ban.id, before, reason, expires, by: who },
  });
  banWatchers.put(recordOf(ban));
  mysql
    .update(
      "UPDATE ai_core_bans SET reason = ?, expires_at = ? WHERE id = ? AND revoked_at IS NULL",
      [reason, expires === null ? null : new Date(expires), ban.id],
    )
    .catch((error: unknown) =>
      log.error(`changing ban #${ban.id} failed`, error),
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

/** Every ban of a target's identifiers (online player or `{ identifiers }`), newest first; [] on a wrong target. */
export function banHistory(target: unknown): Promise<BanRecord[]> {
  const found = readTarget(target);
  return found ? historyOf(found.identifiers) : Promise.resolve([]);
}

/** A page of bans of a checked query. */
export const banList = (query: ParsedBanQuery): Promise<BanListPage> =>
  listBans(query, store);

/** A page of bans; null on a wrong query. */
export function findBans(query: unknown): Promise<BanListPage | null> {
  const parsed = readBanQuery(query);
  return parsed ? banList(parsed) : Promise.resolve(null);
}
