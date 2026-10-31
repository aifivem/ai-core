import { ByResource } from "@aicore-fivem/lib/fivem";

/** Bucket 0 is the world; ids below this stay free for scripts that still pick their own fixed bucket. */
export const FIRST_BUCKET = 1000;

/**
 * Routing bucket ids handed out to whoever needs a separate world (instanced interiors, the character screen):
 * released ids are reused first, so ids stay low and no two holders ever share one. Every id is owned by the resource
 * that took it (lib `ByResource`), so a stopped resource gives all of them back at once (`onDropped` hears each).
 */
export class BucketPool {
  private next = FIRST_BUCKET;
  private readonly free: number[] = [];
  /** id -> tag ("property:12", "character-screen"), owned by the resource that holds it. */
  private readonly leases: ByResource<number, string>;

  constructor(onDropped?: (owner: string, id: number, tag: string) => void) {
    this.leases = new ByResource({
      onDrop: (owner, id, tag) => {
        this.free.push(id);
        onDropped?.(owner, id, tag);
      },
    });
  }

  acquire(owner: string, tag: string): number {
    const id = this.free.pop() ?? this.next++;
    this.leases.set(id, tag, owner);
    return id;
  }

  /** Gives an id back; only its owner can. False when `owner` does not hold it. */
  release(owner: string, id: number): boolean {
    if (this.leases.ownerOf(id) !== owner) return false;
    this.leases.delete(id);
    this.free.push(id);
    return true;
  }

  /** Every id an owner holds goes back (what its resource's stop does). */
  releaseOwner(owner: string): void {
    this.leases.dropResource(owner);
  }

  tagOf(id: number): string | undefined {
    return this.leases.get(id);
  }

  get size(): number {
    return this.leases.size;
  }
}
