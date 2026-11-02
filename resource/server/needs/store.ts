import { NEEDS, readNeedsSettings, type Need } from "common/needs";
import { panel } from "../content";
import type { Player } from "../player/player";

/** The needs ai-core writes: hunger and thirst (its own), stress (for ai-hud while it keeps stress). */
export type MetaNeed = Need | "stress";

/** ai-core's hunger / thirst settings (`data/needs.json`), kept current by the panel. */
export const needsSettings = panel.view("needs", readNeedsSettings);

/** QB's defaults for a missing key (what the bridges show too). */
const FALLBACK: Record<MetaNeed, number> = {
  hunger: 100,
  thirst: 100,
  stress: 0,
};

const clamp = (v: number): number => Math.min(100, Math.max(0, v));

/** Exact values of one loaded character (null = take the metadata). */
class Exact {
  hunger: number | null = null;
  thirst: number | null = null;
  stress: number | null = null;
}

/**
 * The one writer of loaded characters' needs: metadata `hunger` / `thirst` / `stress` (QB's keys, 0-100) hold whole
 * numbers, the decimals stay here. A write reaches metadata (and so the owner's player data delta, the bridges and
 * the periodic save) only when the whole number changes. A value someone else wrote into metadata (a QB script's
 * `SetMetaData`, the admin panel) wins over the kept decimals.
 */
class NeedsStore {
  private readonly exact = new WeakMap<Player, Exact>();
  private readonly listeners: ((player: Player, need: MetaNeed) => void)[] = [];

  /** A character's metadata before its load: missing hunger / thirst get the panel's start values (a new character). */
  seed(metadata: Record<string, unknown>): void {
    const start = needsSettings.value.start;
    for (const need of NEEDS)
      if (typeof metadata[need] !== "number") metadata[need] = start[need];
  }

  get(player: Player, need: MetaNeed): number {
    const meta = player.getMeta(need);
    const stored =
      typeof meta === "number" && Number.isFinite(meta)
        ? clamp(meta)
        : FALLBACK[need];
    const exact = this.exact.get(player)?.[need] ?? null;
    return exact !== null && Math.round(exact) === stored ? exact : stored;
  }

  set(player: Player, need: MetaNeed, value: number): void {
    let exact = this.exact.get(player);
    if (!exact) {
      exact = new Exact();
      this.exact.set(player, exact);
    }
    const next = clamp(value);
    exact[need] = next;
    const whole = Math.round(next);
    if (player.getMeta(need) === whole) return;
    player.setMeta(need, whole);
    for (const listener of this.listeners) listener(player, need);
  }

  add(player: Player, need: MetaNeed, amount: number): void {
    this.set(player, need, this.get(player, need) + amount);
  }

  /** Runs after a need's whole number changed (a HUD draws it). */
  onChange(listener: (player: Player, need: MetaNeed) => void): void {
    this.listeners.push(listener);
  }
}

export const needsStore = new NeedsStore();
