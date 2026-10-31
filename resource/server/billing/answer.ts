import { log } from "../log";

/** A Lua export's first return value (several returns reach JavaScript as an array). */
export const first = (raw: unknown): unknown =>
  Array.isArray(raw) ? raw[0] : raw;

/**
 * Whether a billing script took a call: a truthy first return value, or a Promise (the export waits for its database;
 * its result is only logged when it fails).
 */
export function accepted(resource: string, raw: unknown): boolean {
  if (raw instanceof Promise) {
    raw.then(
      (value: unknown) => {
        if (!first(value)) log.warn(`${resource} refused a bill`);
      },
      (error: unknown) => log.error(`${resource} bill failed`, error),
    );
    return true;
  }
  return Boolean(first(raw));
}

/** Calls `done` with a list from an export that answers a list or a Promise of one. */
export function listOf<T>(
  raw: unknown,
  read: (rows: unknown[]) => T[],
  done: (list: T[] | null) => void,
): void {
  const answer = (value: unknown) => {
    const rows = first(value);
    done(Array.isArray(rows) ? read(rows) : null);
  };
  if (raw instanceof Promise)
    raw.then(answer, (error: unknown) => {
      log.error("reading bills failed", error);
      done(null);
    });
  else answer(raw);
}
