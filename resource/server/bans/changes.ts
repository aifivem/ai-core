import { caller } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import { BAN_IDENTIFIERS, type BanInfo } from "@aicore-fivem/shared";
import { mysql } from "@aicore-fivem/mysql";
import { actorName } from "../characters/manage";
import { log } from "../log";
import { coreLog } from "../logs";
import { activeBans, refusal } from "./active";
import { adminOf, readMinutes, readReason } from "./parse";
import { recordOf } from "./query";
import { identifiersOf, readTarget, type BanTargetFound } from "./targets";
import { banWatchers } from "./watchers";

/**
 * Banning, changing and lifting: memory at once (the gate and `IsBanned` see it), the row follows, and admins with a
 * ban screen open get the ban (`watchers.ts`). Logged on ai-core's `bans` channel.
 */

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
  activeBans.add(ban);
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
        activeBans.written(ban, id);
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
      ? activeBans.get(banId)
      : undefined;
  return ban && (ban.expires === null || ban.expires > now) ? ban : undefined;
}

/** Lifts an active ban by id (memory at once, the row follows). */
export function unbanPlayer(banId: unknown, by: unknown): boolean {
  const now = Date.now();
  const ban = activeBan(banId, now);
  if (!ban) return false;
  const who = actorName(by, caller());
  activeBans.remove(ban);
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
