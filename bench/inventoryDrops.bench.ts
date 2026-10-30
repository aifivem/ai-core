// ai-inventory ground drops at scale (`bun bench/inventoryDrops.bench.ts`): the merge lookup of `drops.at`
// (ai-inventory resource/server/drops.ts:79-82, copied: the module pulls the panel and the database in) and the
// size of the drop snapshot every loading player gets (`drops.points()`, session.ts:14), at 1k / 10k / 100k drops.
// Also shows that `metaKey` (inventory.ts:8-11) drops nested metadata keys.
import { kb, msgpackSize } from "./msgpackSize";

interface Drop {
  id: string;
  x: number;
  y: number;
  z: number;
}
const MERGE_DISTANCE = 1.5;

function at(drops: Map<string, Drop>, x: number, y: number, z: number) {
  for (const drop of drops.values())
    if (Math.hypot(drop.x - x, drop.y - y, drop.z - z) <= MERGE_DISTANCE)
      return drop;
  return null;
}

for (const count of [1_000, 10_000, 100_000]) {
  const drops = new Map<string, Drop>();
  for (let i = 0; i < count; i++)
    drops.set(`drop:${i + 1}`, {
      id: `drop:${i + 1}`,
      x: ((i * 7919) % 8000) - 4000,
      y: ((i * 104_729) % 12000) - 4000,
      z: 30.123456,
    });
  const calls = 1000;
  const t = performance.now();
  for (let i = 0; i < calls; i++) at(drops, 9999, 9999, 0); // a new drop: full walk
  const per = (performance.now() - t) / calls;
  const points = [...drops.values()];
  console.log(
    `${count.toLocaleString("en-US")} drops: one drop action walks them all ${(per * 1000).toFixed(0)} µs; join snapshot ${kb(msgpackSize([points]))}`,
  );
}

// metaKey as written: the replacer array also filters nested objects' keys.
const metaKey = (metadata: Record<string, unknown>): string => {
  const keys = Object.keys(metadata).sort();
  return keys.length === 0 ? "" : JSON.stringify(metadata, keys);
};
const a = { info: { owner: "John" } };
const b = { info: { owner: "Jane", serial: "X1" } };
console.log(
  `metaKey(${JSON.stringify(a)}) = ${metaKey(a)}, metaKey(${JSON.stringify(b)}) = ${metaKey(b)}, equal: ${metaKey(a) === metaKey(b)}`,
);
