import { log } from "../log";

/** Hands the answer to the caller's callback (a throwing callback is logged, never left unanswered). */
export function answer<T>(
  what: string,
  work: Promise<T>,
  done: unknown,
  fallback: T,
): void {
  work
    .catch((error: unknown) => {
      log.error(`${what} failed`, error);
      return fallback;
    })
    .then((result) => {
      if (typeof done === "function") (done as (result: T) => void)(result);
    })
    .catch((error: unknown) => log.error(`${what}: callback failed`, error));
}
