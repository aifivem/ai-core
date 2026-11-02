import { bool, int, num, record } from "@aifivem/lib/shared";

/**
 * Hunger and thirst: ai-core keeps them in character metadata (QB's keys, 0-100, 100 = full) and its panel file
 * `data/needs.json` (`sync: "all"`: the client's low-needs warnings read it) holds every value. No natives: the web
 * preview imports the defaults through the schema.
 */
export const NEEDS = ["hunger", "thirst"] as const;
export type Need = (typeof NEEDS)[number];

export const isNeed = (v: unknown): v is Need =>
  v === "hunger" || v === "thirst";

/** Low hunger / thirst: a notification, and below the critical level dizziness and health loss. */
export interface NeedWarnings {
  /** Notify below `lowAt` (hungry, thirsty or both), at most every `notifyEvery` seconds. */
  notify: boolean;
  lowAt: number;
  notifyEvery: number;
  /** Below this, dizziness and health loss (each switched on its own) and the critical notification. */
  criticalAt: number;
  /** Dizziness: the screen fades out and in every `faintEvery` seconds. */
  faint: boolean;
  faintEvery: number;
  /** Seconds the fade out / in takes. */
  fadeOut: number;
  fadeIn: number;
  /** Health loss: `damage` health every `hurtEvery` seconds. */
  hurt: boolean;
  damage: number;
  hurtEvery: number;
}

export interface NeedsSettings {
  /** Points lost per minute of play, while `enabled`. */
  decay: { enabled: boolean } & Record<Need, number>;
  /** What a character without a stored value starts with (a new character). */
  start: Record<Need, number>;
  warnings: NeedWarnings;
}

export const NEEDS_DEFAULTS: NeedsSettings = {
  decay: { enabled: true, hunger: 0.25, thirst: 0.35 },
  start: { hunger: 100, thirst: 100 },
  warnings: {
    notify: true,
    lowAt: 15,
    notifyEvery: 60,
    faint: true,
    criticalAt: 5,
    faintEvery: 20,
    fadeOut: 4.5,
    fadeIn: 2.5,
    hurt: true,
    damage: 2,
    hurtEvery: 10,
  },
};

export function readNeedsSettings(raw: unknown): NeedsSettings {
  const s = record(raw);
  const decay = record(s.decay);
  const start = record(s.start);
  const w = record(s.warnings);
  const d = NEEDS_DEFAULTS;
  return {
    decay: {
      enabled: bool(decay.enabled, d.decay.enabled),
      hunger: num(decay.hunger, d.decay.hunger, 0, 10),
      thirst: num(decay.thirst, d.decay.thirst, 0, 10),
    },
    start: {
      hunger: int(start.hunger, d.start.hunger, 0, 100),
      thirst: int(start.thirst, d.start.thirst, 0, 100),
    },
    warnings: {
      notify: bool(w.notify, d.warnings.notify),
      lowAt: int(w.lowAt, d.warnings.lowAt, 1, 100),
      notifyEvery: int(w.notifyEvery, d.warnings.notifyEvery, 10, 3600),
      faint: bool(w.faint, d.warnings.faint),
      criticalAt: int(w.criticalAt, d.warnings.criticalAt, 1, 100),
      faintEvery: int(w.faintEvery, d.warnings.faintEvery, 10, 3600),
      fadeOut: num(w.fadeOut, d.warnings.fadeOut, 0.5, 10),
      fadeIn: num(w.fadeIn, d.warnings.fadeIn, 0.5, 10),
      hurt: bool(w.hurt, d.warnings.hurt),
      damage: num(w.damage, d.warnings.damage, 1, 50),
      hurtEvery: int(w.hurtEvery, d.warnings.hurtEvery, 5, 3600),
    },
  };
}
