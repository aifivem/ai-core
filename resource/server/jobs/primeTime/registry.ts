import type { PrimeTimeAdapter } from "./adapter";
import { tgiannPoliceAlert } from "./adapters/tgiann-policealert";

/**
 * Every script whose prime hours ai-core can use, in detection order: `auto` uses the first one running, else
 * ai-core's own panel hours. A new one = one adapter file, one line here and its name in `names.ts`.
 */
export const PRIME_TIME_SYSTEMS: readonly PrimeTimeAdapter[] = [
  tgiannPoliceAlert,
];
