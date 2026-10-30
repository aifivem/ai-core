/** Bucket 0 is the world; ids below this stay free for scripts that still pick their own fixed bucket. */
export const FIRST_BUCKET = 1000;

/** Who holds a bucket and why (`tag`: "property:12", "character-screen"). */
interface Lease {
  owner: string;
  tag: string;
}

/**
 * Routing bucket ids handed out to whoever needs a separate world (instanced interiors, the character screen):
 * released ids are reused first, so ids stay low and no two holders ever share one. Every holder's ids are kept per
 * owner resource, so a stopped resource gives all of them back at once.
 */
export class BucketPool {
  private next = FIRST_BUCKET;
  private readonly free: number[] = [];
  private readonly leases = new Map<number, Lease>();
  private readonly byOwner = new Map<string, Set<number>>();

  acquire(owner: string, tag: string): number {
    const id = this.free.pop() ?? this.next++;
    this.leases.set(id, { owner, tag });
    let set = this.byOwner.get(owner);
    if (!set) this.byOwner.set(owner, (set = new Set()));
    set.add(id);
    return id;
  }

  /** Gives an id back; only its owner can. False when `owner` does not hold it. */
  release(owner: string, id: number): boolean {
    const lease = this.leases.get(id);
    if (lease?.owner !== owner) return false;
    this.leases.delete(id);
    const set = this.byOwner.get(owner);
    set?.delete(id);
    if (set?.size === 0) this.byOwner.delete(owner);
    this.free.push(id);
    return true;
  }

  /** Every id an owner holds goes back (its resource stopped); answers them. */
  releaseOwner(owner: string): number[] {
    const ids = [...(this.byOwner.get(owner) ?? [])];
    for (const id of ids) this.release(owner, id);
    return ids;
  }

  tagOf(id: number): string | undefined {
    return this.leases.get(id)?.tag;
  }

  get size(): number {
    return this.leases.size;
  }
}
