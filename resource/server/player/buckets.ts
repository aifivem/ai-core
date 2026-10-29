/** Routing buckets of the character screen: one private, empty bucket per player so nobody sees anyone else. */
const SELECT_BUCKET_BASE = 50_000;

export function enterSelectBucket(source: number): void {
  const bucket = SELECT_BUCKET_BASE + source;
  SetRoutingBucketPopulationEnabled(bucket, false);
  SetRoutingBucketEntityLockdownMode(bucket, "strict");
  SetPlayerRoutingBucket(String(source), bucket);
}

export function enterWorldBucket(source: number): void {
  SetPlayerRoutingBucket(String(source), 0);
}
