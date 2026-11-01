import { isAdmin, onClientCallback } from "@aicore-fivem/lib/server";
import { fail, isRecord } from "@aicore-fivem/lib/shared";
import { BAN_IDENTIFIERS } from "@aicore-fivem/shared";
import {
  ADMIN_BANS,
  type BansAction,
  type BansHistoryAnswer,
  type BansListAnswer,
} from "common/adminBans";
import {
  banList,
  createBan,
  editBan,
  isBanned,
  readMinutes,
  readReason,
  unbanPlayer,
} from "../bans";
import { historyOf, readBanQuery } from "../bans/query";
import type { Identifiers } from "../bans/store";
import {
  identifiersOf,
  readIdentifiers,
  type BanTargetFound,
} from "../bans/targets";
import { banWatchers } from "../bans/watchers";
import { players } from "../player/registry";
import { parse } from "./players/gate";
import { accountOfCharacter } from "./players/repo";

/**
 * The admin panel's ban screens: the Bans section (`list`, every ban by state and search) and a character's Bans card
 * (`history`). Both snapshots subscribe the admin to ban changes (`bans/watchers.ts`), `close` ends it. Every action
 * answers `{ ok, error? }`; the ban itself arrives as a delta from the mutator. Logged by the mutators on `bans`.
 */

/** Same limit as every other panel write. */
const RATE = { count: 30, windowMs: 10_000 };

function action<const A extends readonly unknown[]>(
  name: BansAction,
  args: (raw: unknown[]) => A | null,
  handler: (source: number, ...args: A) => unknown,
): void {
  onClientCallback(
    ADMIN_BANS.callback(name),
    { guards: [isAdmin()], rate: RATE, args },
    handler,
  );
}

/** A character's player while online (every identifier, ip too), else its account's stored identifiers. */
async function subjectOfCharacter(
  charId: number,
): Promise<(BanTargetFound & { name?: string }) | null> {
  const source = players.byCharacter(charId)?.source;
  if (source !== undefined)
    return { identifiers: identifiersOf(source), source };
  const account = await accountOfCharacter(charId);
  if (!account) return null;
  const identifiers: Identifiers = { fivem: account.fivem };
  if (account.license) identifiers.license = account.license;
  if (account.discord) identifiers.discord = account.discord;
  return { identifiers, source: null, name: account.name };
}

type Subject = { charId: number } | { identifiers: Identifiers };

const sameAccount = (a: Identifiers, b: Identifiers): boolean =>
  BAN_IDENTIFIERS.some((t) => t !== "ip" && a[t] && a[t] === b[t]);

action(
  "list",
  ([query]) => {
    const q = readBanQuery(query);
    return q ? [q] : null;
  },
  async (source, query): Promise<BansListAnswer> => {
    banWatchers.watchList(source);
    const page = await banList(query);
    return { ...page, now: Date.now() };
  },
);

action(
  "history",
  ([charId]) => {
    const id = parse.charId(charId);
    return id === null ? null : [id];
  },
  async (source, charId): Promise<BansHistoryAnswer | null> => {
    const subject = await subjectOfCharacter(charId);
    if (!subject) return null;
    banWatchers.watchHistory(source, subject.identifiers);
    return { bans: await historyOf(subject.identifiers), now: Date.now() };
  },
);

action(
  "close",
  () => [],
  (source) => {
    banWatchers.stop(source);
    return { ok: true };
  },
);

/** `[subject, reason, minutes | null]`: a character (`{ charId }`) or identifiers typed in the Bans section. */
action(
  "ban",
  ([subject, reason, minutes]):
    readonly [Subject, string, number | null] | null => {
    const why = readReason(reason);
    const mins = readMinutes(minutes);
    if (!isRecord(subject) || why.length < 3 || mins === undefined) return null;
    if (subject.charId !== undefined) {
      const charId = parse.charId(subject.charId);
      return charId === null ? null : [{ charId }, why, mins];
    }
    const identifiers = readIdentifiers(subject.identifiers);
    return identifiers ? [{ identifiers }, why, mins] : null;
  },
  async (source, subject, reason, minutes) => {
    const target =
      "charId" in subject
        ? await subjectOfCharacter(subject.charId)
        : { identifiers: subject.identifiers, source: null };
    if (!target) return fail("ADMIN_PLAYERS_ERR_GONE");
    if (sameAccount(target.identifiers, identifiersOf(source)))
      return fail("ADMIN_BANS_ERR_SELF");
    if (isBanned({ identifiers: target.identifiers }))
      return fail("ADMIN_BANS_ERR_ALREADY");
    createBan(target, reason, minutes, source, {
      name: "name" in target ? target.name : undefined,
    });
    return { ok: true };
  },
);

action(
  "unban",
  ([banId]) => {
    const id = parse.charId(banId);
    return id === null ? null : [id];
  },
  (source, banId) =>
    unbanPlayer(banId, source) ? { ok: true } : fail("ADMIN_BANS_ERR_GONE"),
);

/** `[banId, reason, minutes]`: minutes from now, null = permanent, false = keep the end. */
action(
  "edit",
  ([banId, reason, minutes]):
    readonly [number, string, number | null | false] | null => {
    const id = parse.charId(banId);
    const why = readReason(reason);
    if (id === null || why.length < 3) return null;
    if (minutes === false) return [id, why, false];
    const mins = readMinutes(minutes);
    return mins === undefined ? null : [id, why, mins];
  },
  (source, banId, reason, minutes) =>
    editBan(banId, minutes === false ? { reason } : { reason, minutes }, source)
      ? { ok: true }
      : fail("ADMIN_BANS_ERR_GONE"),
);
