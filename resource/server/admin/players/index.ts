import {
  CORE,
  type CharacterInfo,
  type GangMembership,
  type JobMembership,
} from "@aicore-fivem/shared";
import type { SearchPage } from "common/adminPlayers";
import { log } from "../../log";
import { players } from "../../player/registry";
import { action, parse } from "./gate";
import { searchReady } from "./indexes";
import { parseSearch, search } from "./search";
import { loadView } from "./view";
import { charWatchers } from "./charWatchers";
import { listWatchers } from "./listWatchers";
import "./edit";
import "./memberships";
import "./world";
import "./inventoryActions";

/**
 * The admin panel's Players section: the online list and the search over stored characters, one character's
 * snapshot, and the deltas while the screen is open. Edits: `edit.ts` (character data),
 * `memberships.ts` (jobs and gangs), `world.ts` (the player), `inventoryActions.ts` (items).
 */

// The list itself follows as latent `rows` chunks (2,048 rows are ~240 KB).
action(
  "online",
  () => [],
  (source) => {
    listWatchers.watchList(source);
    return { ok: true };
  },
);

action(
  "search",
  ([query, cursor]) => {
    const q = typeof query === "string" ? parseSearch(query) : null;
    const c = cursor == null ? null : parse.charId(cursor);
    return q && (cursor == null || c !== null) ? ([q, c] as const) : null;
  },
  async (_source, query, cursor): Promise<SearchPage> => {
    await searchReady;
    return search(
      query,
      cursor,
      (charId) => players.byCharacter(charId)?.source ?? null,
    );
  },
);

action(
  "open",
  ([charId]) => {
    const id = parse.charId(charId);
    return id === null ? null : [id];
  },
  async (source, charId) => {
    charWatchers.watchChar(source, charId);
    const view = await loadView(charId);
    if (!view) charWatchers.unwatchChar(source);
    return view;
  },
);

action(
  "close",
  ([scope]) =>
    scope === "char" || scope === "all" ? ([scope] as const) : null,
  (source, scope) => {
    if (scope === "all") listWatchers.unwatchList(source);
    charWatchers.unwatchChar(source);
    return { ok: true };
  },
);

// Changes of loaded characters come from the mutators' own local events.
const charOf = (source: number): number | undefined =>
  players.get(source)?.charId;

on(CORE.playerLoadedEvent, (source: number, character: CharacterInfo) => {
  listWatchers.put(source);
  if (!charWatchers.watching(character.id)) return;
  loadView(character.id)
    .then((view) => view && charWatchers.view(view))
    .catch((error: unknown) =>
      log.error(`admin view of #${character.id} failed`, error),
    );
});
on(CORE.playerUnloadedEvent, (source: number, charId: number) => {
  listWatchers.remove(source);
  charWatchers.char(charId, { source: null, duty: null });
});
on(
  CORE.moneyChangedEvent,
  (source: number, account: string, balance: number) => {
    const charId = charOf(source);
    if (charId !== undefined) charWatchers.money(charId, account, balance);
  },
);
on(CORE.jobsChangedEvent, (source: number, jobs: JobMembership[]) => {
  listWatchers.put(source);
  const charId = charOf(source);
  if (charId !== undefined) charWatchers.char(charId, { jobs });
});
on(CORE.dutyChangedEvent, (source: number, duty: string | null) => {
  listWatchers.put(source);
  const charId = charOf(source);
  if (charId !== undefined) charWatchers.char(charId, { duty });
});
on(CORE.gangsChangedEvent, (source: number, gangs: GangMembership[]) => {
  const charId = charOf(source);
  if (charId !== undefined) charWatchers.char(charId, { gangs });
});
on(CORE.activeGangChangedEvent, (source: number, activeGang: string | null) => {
  const charId = charOf(source);
  if (charId !== undefined) charWatchers.char(charId, { activeGang });
});
