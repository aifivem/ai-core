import type {
  BanInfo,
  BanListPage,
  BanRecord,
  BansPage,
} from "@aicore-fivem/shared";
import { activeBans } from "./active";
import { historyOf, listBans } from "./query";
import { readBanQuery, type ParsedBanQuery } from "./search";
import { copyBan } from "./store";
import { readTarget } from "./targets";

/** Reads of bans: the active ones from memory, history and lists through `query.ts`. */

export function isBanned(target: unknown): BanInfo | null {
  const found = readTarget(target);
  const ban = found ? activeBans.find(found.identifiers) : null;
  return ban ? copyBan(ban) : null;
}

export function getBans(page: unknown): BansPage {
  return activeBans.page(
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
  listBans(query, activeBans);

/** A page of bans; null on a wrong query. */
export function findBans(query: unknown): Promise<BanListPage | null> {
  const parsed = readBanQuery(query);
  return parsed ? banList(parsed) : Promise.resolve(null);
}
