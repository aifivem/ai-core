import type { MdtAdapter } from "@aifivem/shared";

/** How long an answer is kept: adapters read the MDT's table or export, and several scripts may ask in a row. */
const KEEP_MS = 30_000;

interface Kept {
  readonly answer: Promise<boolean>;
  readonly until: number;
}

/**
 * Warrant answers of the active MDT by citizenid, kept 30 s (a request in flight is shared, a failed one answers
 * false). Expired entries are swept as the map grows, at most once per keep time; `clear` on an MDT switch.
 */
export class WarrantCache {
  private readonly kept = new Map<string, Kept>();
  private nextSweep = 0;

  constructor(
    private readonly onError: (resource: string, error: unknown) => void,
  ) {}

  ask(adapter: MdtAdapter, citizenid: string): Promise<boolean> {
    const now = Date.now();
    const hit = this.kept.get(citizenid);
    if (hit && hit.until > now) return hit.answer;
    const answer = this.read(adapter, citizenid);
    this.kept.set(citizenid, { answer, until: now + KEEP_MS });
    if (this.kept.size > 1024 && now >= this.nextSweep) this.sweep(now);
    return answer;
  }

  clear(): void {
    this.kept.clear();
  }

  private async read(adapter: MdtAdapter, citizenid: string): Promise<boolean> {
    if (!adapter.hasWarrant) return false;
    try {
      return (await adapter.hasWarrant(citizenid)) === true;
    } catch (error) {
      this.onError(adapter.resource, error);
      return false;
    }
  }

  private sweep(now: number): void {
    this.nextSweep = now + KEEP_MS;
    for (const [key, entry] of this.kept)
      if (entry.until <= now) this.kept.delete(key);
  }
}
