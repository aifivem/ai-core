import type { Logger } from "@aicore-fivem/lib/shared";

/** What every integration adapter has: the resource it talks to and, optionally, the version it is written for. */
export interface Adapter {
  readonly resource: string;
  readonly version?: string;
}

/** Runs `fn` on an adapter; logs and answers `fallback` when there is none or its resource throws. */
export function guarded<A extends Adapter, T>(
  adapter: A | null,
  what: string,
  fn: (adapter: A) => T,
  fallback: T,
  log: Logger,
): T {
  if (!adapter) return fallback;
  try {
    return fn(adapter);
  } catch (error) {
    // While clients load, a resource reads started before its scripts ran: its start event hands state over again.
    if (!String(error).includes("No such export"))
      log.error(`${adapter.resource} ${what} failed`, error);
    return fallback;
  }
}
