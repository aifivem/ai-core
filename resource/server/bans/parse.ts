/** Ban arguments from exports and admin callbacks. */

/** Minutes of a ban: undefined = wrong, null = permanent (at most 100 years). */
export function readMinutes(minutes: unknown): number | null | undefined {
  if (minutes == null) return null;
  return typeof minutes === "number" &&
    Number.isInteger(minutes) &&
    minutes > 0 &&
    minutes <= 52_560_000
    ? minutes
    : undefined;
}

export const readReason = (reason: unknown): string =>
  typeof reason === "string" ? reason.trim().slice(0, 255) : "";

/** The admin's server id for a log line, when `by` is one. */
export const adminOf = (by: unknown): number | undefined =>
  typeof by === "number" && by > 0 ? by : undefined;
