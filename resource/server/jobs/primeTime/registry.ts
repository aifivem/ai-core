import { tgiannPoliceAlert } from "./adapters/tgiann-policealert";

/** A script that keeps prime hours itself and answers whether it is prime time for a job. */
export interface PrimeTimeAdapter {
  readonly resource: string;
  /** The version the adapter is written for (a different installed version is warned once). */
  readonly version?: string;
  isPrimeTime(job?: string): boolean;
}

/**
 * Every script whose prime hours ai-core can use, in detection order: `auto` uses the first one running, else
 * ai-core's own panel hours. A new one = one adapter file, one line here and its name in `names.ts`.
 */
export const PRIME_TIME_SYSTEMS: readonly PrimeTimeAdapter[] = [
  tgiannPoliceAlert,
];
