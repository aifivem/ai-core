import type { MdtAdapter, Warrant } from "@aifivem/shared";
import { log } from "../log";
import { WarrantCache } from "../mdt/warrants";
import { players } from "../player/registry";
import { activeOfChar, hasActive } from "./repo";

const live = (warrant: Warrant, now: number): boolean =>
  warrant.expires === null || warrant.expires > now;

/** The stored-character check, asked through the MDT layer's cache. */
const STORED: MdtAdapter = { resource: "ai-core", hasWarrant: hasActive };

/**
 * ai-core's own warrants in memory: a loaded character's active list (read at load and again after each change of
 * that character, dropped at unload; expiry checked on read), and the answers of stored characters by citizenid
 * (kept 30 s like the MDT's, forgotten when that character's warrants change).
 */
class WarrantStore {
  private readonly lists = new Map<number, Warrant[]>();
  /** The newest read per character: an older answer that arrives later is dropped. */
  private readonly reads = new Map<number, number>();
  private seq = 0;
  private readonly stored = new WarrantCache((_resource, error) =>
    log.error("own warrant check failed", error),
  );

  /** Reads a loaded character's active list again (at load and after each of its changes). */
  async refresh(charId: number): Promise<void> {
    const mine = ++this.seq;
    this.reads.set(charId, mine);
    const rows = await activeOfChar(charId);
    if (this.reads.get(charId) !== mine) return;
    this.reads.delete(charId);
    // The character may have left while the rows were loading.
    if (players.byCharacter(charId)) this.lists.set(charId, rows);
  }

  drop(charId: number): void {
    this.lists.delete(charId);
    this.reads.delete(charId);
  }

  /** A character's active warrants, newest first: memory while loaded, else one indexed read. */
  of(charId: number): Promise<Warrant[]> {
    const list = this.lists.get(charId);
    if (!list) return activeOfChar(charId);
    const now = Date.now();
    return Promise.resolve(list.filter((w) => live(w, now)));
  }

  /** Whether a character has an active own warrant: a memory read while loaded, else the cached stored answer. */
  has(citizenid: string): Promise<boolean> {
    const player = players.byCitizen(citizenid);
    const list = player && this.lists.get(player.charId);
    if (!list) return this.stored.ask(STORED, citizenid);
    const now = Date.now();
    return Promise.resolve(list.some((w) => live(w, now)));
  }

  /** A citizen's warrants changed: the next stored check reads again. */
  forget(citizenid: string): void {
    this.stored.forget(citizenid);
  }
}

export const warrantStore = new WarrantStore();
