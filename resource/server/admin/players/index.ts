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
import { playerWatchers } from "./watchers";
import "./edit";
import "./world";

/**
 * The admin panel's Players section: the online list and the search over stored characters, one character's
 * snapshot, and the deltas while the screen is open. Edits: `edit.ts` (character data), `world.ts` (the player).
 */

// The list itself follows as latent `rows` chunks (2,048 rows are ~240 KB).
action(
  "online",
  () => [],
  (source) => {
    playerWatchers.watchList(source);
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
    playerWatchers.watchChar(source, charId);
    const view = await loadView(charId);
    if (!view) playerWatchers.unwatchChar(source);
    return view;
  },
);

action(
  "close",
  ([scope]) =>
    scope === "char" || scope === "all" ? ([scope] as const) : null,
  (source, scope) => {
    if (scope === "all") playerWatchers.drop(source);
    else playerWatchers.unwatchChar(source);
    return { ok: true };
  },
);

on("playerDropped", () => playerWatchers.drop(Number(globalThis.source)));

// Changes of loaded characters come from the mutators' own local events.
const charOf = (source: number): number | undefined =>
  players.get(source)?.charId;

on(CORE.playerLoadedEvent, (source: number, character: CharacterInfo) => {
  playerWatchers.put(source);
  if (!playerWatchers.watching(character.id)) return;
  loadView(character.id)
    .then((view) => view && playerWatchers.view(view))
    .catch((error: unknown) =>
      log.error(`admin view of #${character.id} failed`, error),
    );
});
on(CORE.playerUnloadedEvent, (source: number, charId: number) => {
  playerWatchers.remove(source);
  playerWatchers.char(charId, { source: null, duty: null });
});
on(
  CORE.moneyChangedEvent,
  (source: number, account: string, balance: number) => {
    const charId = charOf(source);
    if (charId !== undefined) playerWatchers.money(charId, account, balance);
  },
);
on(CORE.jobsChangedEvent, (source: number, jobs: JobMembership[]) => {
  playerWatchers.put(source);
  const charId = charOf(source);
  if (charId !== undefined) playerWatchers.char(charId, { jobs });
});
on(CORE.dutyChangedEvent, (source: number, duty: string | null) => {
  playerWatchers.put(source);
  const charId = charOf(source);
  if (charId !== undefined) playerWatchers.char(charId, { duty });
});
on(CORE.gangsChangedEvent, (source: number, gangs: GangMembership[]) => {
  const charId = charOf(source);
  if (charId !== undefined) playerWatchers.char(charId, { gangs });
});
on(CORE.activeGangChangedEvent, (source: number, activeGang: string | null) => {
  const charId = charOf(source);
  if (charId !== undefined) playerWatchers.char(charId, { activeGang });
});
