// Routing bucket allocator at scale (`bun bench/buckets.bench.ts`): ai-core's real `BucketPool` (lib `ByResource`
// inside, its stop listener stubbed). Acquire N buckets over 20 owners, release every other one, acquire them again
// (reuse), then drop one owner.
import { BucketPool } from "../resource/server/buckets/pool";

const g = globalThis as Record<string, unknown>;
g.on = () => undefined;
g.IsDuplicityVersion = () => true;

const time = (fn: () => unknown): number => {
  const t = performance.now();
  fn();
  return performance.now() - t;
};
const per = (ms: number, n: number) => `${((ms * 1e6) / n).toFixed(0)} ns`;

for (const count of [100_000, 1_000_000]) {
  let freed = 0;
  const pool = new BucketPool(() => freed++);
  const ids: number[] = [];
  const owner = (i: number) => `resource${i % 20}`;
  const acquire = time(() => {
    for (let i = 0; i < count; i++)
      ids.push(pool.acquire(owner(i), `tag:${i}`));
  });
  const release = time(() => {
    for (let i = 0; i < count; i += 2) pool.release(owner(i), ids[i] ?? 0);
  });
  let highest = 0;
  const reuse = time(() => {
    for (let i = 0; i < count; i += 2)
      highest = Math.max(highest, pool.acquire(owner(i), "again"));
  });
  const unique = new Set(ids).size === count;
  const drop = time(() => pool.releaseOwner("resource3"));
  console.log(
    `${count.toLocaleString("en-US")} buckets: acquire ${acquire.toFixed(0)} ms (${per(acquire, count)} each), release half ${release.toFixed(0)} ms, re-acquire ${reuse.toFixed(0)} ms (highest id ${highest}, ids unique: ${unique}), one stopped owner frees ${freed.toLocaleString("en-US")} in ${drop.toFixed(1)} ms`,
  );
}
