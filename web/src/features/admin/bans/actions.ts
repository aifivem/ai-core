import { fetchNui } from "fivem-nui-react";
import { ServerClock } from "@aicore-fivem/lib/shared";
import type {
  BanCursor,
  BanFilter,
  BanIdentifier,
  BanRecord,
} from "@aicore-fivem/shared";
import type {
  BansAction,
  BansResult,
} from "../../../../../resource/common/adminBans";
import { NuiCallback } from "../../../../../resource/common/nui";
import { mockBans } from "../../../dev/bansMock";
import { router } from "../../../router";
import { store } from "../../../store";
import {
  cleared,
  historyLoaded,
  historyLoading,
  inspect,
  listLoading,
  moreLoading,
  pageLoaded,
  put,
} from "./slice";

/** Every navigation and NUI call of the ban screens; components never call the router or fetchNui themselves. */

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** The server's clock (taken at each snapshot): states and time left are worked out on it. */
export const clock = new ServerClock();

function call(action: BansAction, args: unknown[]): Promise<unknown> {
  return fetchNui<unknown>(
    NuiCallback.adminBans,
    { action, args },
    { mockData: mockBans(action, args) },
  ).catch(() => null);
}

const toResult = (value: unknown): BansResult =>
  isObject(value) && value.ok === true
    ? { ok: true }
    : {
        ok: false,
        error:
          isObject(value) && typeof value.error === "string"
            ? value.error
            : "ADMIN_ERR_BUSY",
      };

/** ai-core's server builds the rows; only the outer shape is checked. */
const toBans = (value: unknown): BanRecord[] | null =>
  isObject(value) && Array.isArray(value.bans)
    ? (value.bans as BanRecord[])
    : null;

export function goBans(search?: string): void {
  void router.navigate({
    to: "/admin/bans",
    search: search ? { q: search } : {},
  });
}

async function page(
  filter: BanFilter,
  search: string,
  cursor: BanCursor | null,
): Promise<void> {
  const answer = await call("list", [{ filter, search, cursor }]);
  if (isObject(answer) && typeof answer.now === "number")
    clock.sync(answer.now);
  store.dispatch(
    pageLoaded({
      filter,
      search,
      bans: toBans(answer) ?? [],
      next:
        isObject(answer) && isObject(answer.next)
          ? (answer.next as unknown as BanCursor)
          : null,
      more: cursor !== null,
    }),
  );
}

/** The list for a tab and search: its first page (and the admin is subscribed to ban changes). */
export function openList(filter: BanFilter, search: string): Promise<void> {
  store.dispatch(listLoading({ filter, search }));
  return page(filter, search, null);
}

/** The next page of the shown list. */
export function loadMore(): Promise<void> {
  const { filter, search, next, loading } = store.getState().bans;
  if (!next || loading) return Promise.resolve();
  store.dispatch(moreLoading());
  return page(filter, search, next);
}

export function closeBans(scope: "list" | "history"): void {
  store.dispatch(cleared(scope));
  void call("close", []);
}

/** A character's ban history (its account's identifiers; the player's ip too while online). */
export async function openHistory(charId: number): Promise<void> {
  store.dispatch(historyLoading(charId));
  const answer = await call("history", [charId]);
  if (isObject(answer) && typeof answer.now === "number")
    clock.sync(answer.now);
  store.dispatch(historyLoaded({ charId, bans: toBans(answer) ?? [] }));
}

export function inspectBan(ban: BanRecord | null): void {
  store.dispatch(inspect(ban));
}

/** Bans a character (its player while online) or typed identifiers; `minutes` null = permanent. */
export async function banSubject(
  subject:
    | { charId: number }
    | { identifiers: Partial<Record<BanIdentifier, string>> },
  reason: string,
  minutes: number | null,
): Promise<BansResult> {
  return toResult(await call("ban", [subject, reason, minutes]));
}

export async function unban(banId: number): Promise<BansResult> {
  return toResult(await call("unban", [banId]));
}

/** A new reason and, unless `minutes` is false, a new end counted from now (null = permanent). */
export async function editBan(
  banId: number,
  reason: string,
  minutes: number | null | false,
): Promise<BansResult> {
  return toResult(await call("edit", [banId, reason, minutes]));
}

export function onBansDelta(value: unknown): void {
  if (isObject(value) && value.kind === "put" && isObject(value.ban))
    store.dispatch(
      put({ ban: value.ban as unknown as BanRecord, now: clock.now() }),
    );
}
