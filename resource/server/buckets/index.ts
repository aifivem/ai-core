import { caller, registerExport } from "@aicore-fivem/lib/server";
import { CORE } from "@aicore-fivem/shared";
import { log } from "../log";
import { BucketPool } from "./pool";

/**
 * ai-core's routing bucket allocator (lib `buckets`): every separate world (an instanced property, a robbery house,
 * the character screen) takes a free id here, so no two scripts ever share one. A new bucket has no population and
 * strict entity lockdown. A stopped resource's buckets go back to the pool; moving players out stays the caller's job.
 */
export const buckets = new BucketPool((owner, id, tag) => {
  if (owner !== CORE.resource)
    log.info(`${owner} stopped: routing bucket ${id} (${tag}) free again`);
});

/** Takes a free bucket for `owner` (a resource name) and sets it up. */
export function acquireBucket(owner: string, tag: string): number {
  const id = buckets.acquire(owner, tag);
  SetRoutingBucketPopulationEnabled(id, false);
  SetRoutingBucketEntityLockdownMode(id, "strict");
  return id;
}

const tagOf = (v: unknown): string =>
  typeof v === "string" && v ? v.slice(0, 64) : "unnamed";

registerExport("AcquireBucket", (tag: unknown) =>
  acquireBucket(caller(), tagOf(tag)),
);
registerExport(
  "ReleaseBucket",
  (id: unknown) => typeof id === "number" && buckets.release(caller(), id),
);
