/** Accounts rebuilt per statement batch. */
export const BATCH_ACCOUNTS = 100;

/** Takes up to `max` values out of a set (in insertion order). */
export function take<T>(set: Set<T>, max = Infinity): T[] {
  const out: T[] = [];
  for (const value of set) {
    if (out.length >= max) break;
    out.push(value);
  }
  for (const value of out) set.delete(value);
  return out;
}
