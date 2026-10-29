import { dutyCountKey } from "@aicore-fivem/shared";

/** On-duty counts per job, published as per-key GlobalState (counts only, never member lists). */
const counts = new Map<string, number>();

export function changeDutyCount(job: string, delta: number): void {
  const next = Math.max(0, (counts.get(job) ?? 0) + delta);
  counts.set(job, next);
  GlobalState.set(dutyCountKey(job), next, true);
}

export function dutyCount(job: string): number {
  return counts.get(job) ?? 0;
}

/** GlobalState survives a resource restart: start every known job at 0. */
export function resetDutyCounts(jobs: Iterable<string>): void {
  for (const job of jobs) {
    counts.set(job, 0);
    GlobalState.set(dutyCountKey(job), 0, true);
  }
}
