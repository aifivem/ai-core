import { PRIME_TIME_SYSTEM_NAMES } from "../jobs/primeTime/names";
import { bool, int, num, record } from "./parse";

/** Where prime hours come from: `auto` (the first running script of `PRIME_TIME_SYSTEMS`, else ai-core's), always ai-core's, or one script's. */
export const PRIME_SOURCES: readonly string[] = [
  "auto",
  "ai-core",
  ...PRIME_TIME_SYSTEM_NAMES,
];

/** A prime time window in server hours (0-23); `start > finish` runs past midnight. */
export interface PrimeHours {
  start: number;
  finish: number;
}

/** Settings section `primeTime` (Job rules tab). */
export interface PrimeTimeSettings extends PrimeHours {
  /** Lower the salary outside prime time (the hours and `IsPrimeTime` work either way). */
  enabled: boolean;
  /** `auto`, `ai-core` or a resource of `PRIME_TIME_SYSTEMS`. */
  source: string;
  /** Salary factor outside prime time, unless the rank has its own `offPrimePayment`. */
  offPrimeMultiplier: number;
}

export const DEFAULT_PRIME_TIME: PrimeTimeSettings = {
  enabled: true,
  source: "auto",
  offPrimeMultiplier: 0.5,
  start: 18,
  finish: 1,
};

const hour = (value: unknown, fallback: number): number =>
  int(value, fallback, 0, 23);

export function readPrimeTime(raw: unknown): PrimeTimeSettings {
  const v = record(raw);
  const source =
    typeof v.source === "string" && PRIME_SOURCES.includes(v.source)
      ? v.source
      : "auto";
  return {
    enabled: bool(v.enabled, DEFAULT_PRIME_TIME.enabled),
    source,
    offPrimeMultiplier: num(v.offPrimeMultiplier, 0.5, 0, 1),
    start: hour(v.start, DEFAULT_PRIME_TIME.start),
    finish: hour(v.finish, DEFAULT_PRIME_TIME.finish),
  };
}

/** A job's own prime hours (`primeOwn` on), or null for the default hours. */
export function readJobPrime(v: Record<string, unknown>): PrimeHours | null {
  if (v.primeOwn !== true) return null;
  return {
    start: hour(v.primeStart, DEFAULT_PRIME_TIME.start),
    finish: hour(v.primeFinish, DEFAULT_PRIME_TIME.finish),
  };
}
