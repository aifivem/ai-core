import { fetchNui } from "fivem-nui-react";
import type {
  CharacterView,
  OnlineRow,
  PlayersAction,
  PlayersDelta,
  PlayersResult,
  SearchPage,
} from "../../../../../resource/common/adminPlayers";
import { NuiCallback } from "../../../../../resource/common/nui";
import { mockPlayers } from "../../../dev/playersMock";
import { router } from "../../../router";
import { closePanel } from "../actions";
import { store } from "../../../store";
import {
  cleared,
  delta,
  listOpened,
  viewClosed,
  viewLoaded,
  viewLoading,
} from "./slice";

/** Every navigation and NUI call of the Players section; components never call the router or fetchNui themselves. */

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

function call(action: PlayersAction, args: unknown[]): Promise<unknown> {
  return fetchNui<unknown>(
    NuiCallback.adminPlayers,
    { action, args },
    { mockData: mockPlayers(action, args) },
  ).catch(() => null);
}

const toResult = (value: unknown): PlayersResult =>
  isObject(value) && value.ok === true
    ? { ok: true }
    : {
        ok: false,
        error:
          isObject(value) && typeof value.error === "string"
            ? value.error
            : "ADMIN_ERR_BUSY",
      };

export function goPlayers(char?: number): void {
  void router.navigate({
    to: "/admin/players",
    search: char === undefined ? {} : { char },
  });
}

/**
 * The screen opened: subscribes to the online list. The game sends the snapshot and later changes as latent `rows`
 * messages (`onPlayersDelta`); the browser preview answers the rows at once.
 */
export async function openPlayers(): Promise<void> {
  store.dispatch(listOpened());
  const answer = await call("online", []);
  // ai-core's server builds these rows; only the outer shape is checked.
  if (Array.isArray(answer))
    store.dispatch(
      delta({ kind: "rows", rev: 1, put: answer as OnlineRow[], remove: [] }),
    );
}

export function closePlayers(): void {
  store.dispatch(cleared());
  void call("close", ["all"]);
}

/** One character's snapshot; null answer = it does not exist. */
export async function openCharacter(charId: number): Promise<void> {
  store.dispatch(viewLoading());
  const view = await call("open", [charId]);
  store.dispatch(
    viewLoaded(
      isObject(view) && view.charId === charId
        ? (view as unknown as CharacterView)
        : null,
    ),
  );
}

export function closeCharacter(): void {
  store.dispatch(viewClosed());
  void call("close", ["char"]);
}

export async function searchCharacters(
  query: string,
  cursor: number | null,
): Promise<SearchPage | null> {
  const page = await call("search", [query, cursor]);
  return isObject(page) && Array.isArray(page.rows)
    ? (page as unknown as SearchPage)
    : null;
}

/** An edit or action; the new state arrives as a delta. */
export async function runAction(
  action: Exclude<PlayersAction, "online" | "search" | "open" | "close">,
  args: unknown[],
): Promise<PlayersResult> {
  return toResult(await call(action, args));
}

/** Opens the player's inventory; the panel closes so the inventory can take the screen. */
export async function openInventory(charId: number): Promise<PlayersResult> {
  const result = await runAction("inventory", [charId]);
  if (result.ok) closePanel();
  return result;
}

export function onPlayersDelta(value: unknown): void {
  if (isObject(value) && typeof value.kind === "string")
    store.dispatch(delta(value as unknown as PlayersDelta));
}
