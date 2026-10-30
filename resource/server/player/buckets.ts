import { CORE } from "@aicore-fivem/shared";
import { acquireBucket, buckets } from "../buckets";

/** The character screen: one private, empty bucket per player (from the allocator) so nobody sees anyone else. */
class SelectBuckets {
  private readonly held = new Map<number, number>();

  /** Moves the player into its own bucket (kept while the screen reloads). */
  enter(source: number): void {
    let id = this.held.get(source);
    if (id === undefined) {
      id = acquireBucket(CORE.resource, "character-screen");
      this.held.set(source, id);
    }
    SetPlayerRoutingBucket(String(source), id);
  }

  /** Gives the player's bucket back (spawned or dropped). */
  leave(source: number): void {
    const id = this.held.get(source);
    if (id === undefined) return;
    this.held.delete(source);
    buckets.release(CORE.resource, id);
  }
}

const select = new SelectBuckets();

export function enterSelectBucket(source: number): void {
  select.enter(source);
}

export function enterWorldBucket(source: number): void {
  SetPlayerRoutingBucket(String(source), 0);
  select.leave(source);
}

/** A player who left gives the bucket back without moving. */
export function leaveSelectBucket(source: number): void {
  select.leave(source);
}
