// vRP key-value store at scale (`bun bench/vrpStore.bench.ts`): ai-core's real `VrpStore` and upsert builder with
// the database stubbed (the stub builds every chunk's statement and values, then answers). N keys spread over
// N / 10 characters (10 keys each, 32-byte values): writes, flushes (500-row upserts), cached reads, read-through
// misses, an update of 10 %, and releasing half the characters. Each size runs in its own process (heap figure).
import { upsertStatement } from "../resource/server/vrp/sql";
import type { VrpRow } from "../resource/server/vrp/data";
import { VrpStore } from "../resource/server/vrp/store";

const time = async (fn: () => unknown): Promise<number> => {
  const start = performance.now();
  await fn();
  return performance.now() - start;
};
const per = (ms: number, n: number): string =>
  `${((ms * 1e6) / n).toFixed(0)} ns/op`;
const heap = (): number => {
  Bun.gc(true);
  return process.memoryUsage().heapUsed;
};

const arg = Number(process.argv[2]);
if (!arg) {
  for (const n of [100_000, 1_000_000]) {
    const child = Bun.spawnSync(["bun", import.meta.path, String(n)], {
      stdout: "inherit",
      stderr: "inherit",
    });
    if (child.exitCode !== 0) process.exit(1);
  }
  process.exit(0);
}

const n = arg;
const characters = n / 10;
const live = new Set<string>();
for (let c = 1; c <= characters; c++) live.add(String(c));
let chunks = 0;
let rowsWritten = 0;
let sqlBytes = 0;
const store = new VrpStore({
  backend: {
    read: async () => null,
    write: async (rows: VrpRow[]) => {
      const [sql, values] = upsertStatement(rows);
      chunks++;
      rowsWritten += rows.length;
      sqlBytes += sql.length + values.length;
    },
  },
  isLive: (kind, owner) => kind !== "c" || live.has(owner),
});
const value = "ab".repeat(32);
const ownerOf = (i: number) => String((i % characters) + 1);
const keyOf = (i: number) => `chest:${Math.floor(i / characters)}`;

const before = heap();
const set = await time(() => {
  for (let i = 0; i < n; i++) store.set("c", ownerOf(i), keyOf(i), value);
});
const bytes = (heap() - before) / n;
const flush = await time(() => store.flush());
const flushChunks = chunks;
let seen = 0;
const read = await time(() => {
  for (let i = 0; i < n; i++)
    store.get("c", ownerOf(i), keyOf(i), (hex) => {
      seen += hex.length;
    });
});
const misses = 10_000;
const miss = await time(
  () =>
    new Promise<void>((resolve) => {
      let left = misses;
      for (let i = 0; i < misses; i++)
        store.get("s", "", `missing:${i}`, () => {
          if (--left === 0) resolve();
        });
    }),
);
const update = await time(() => {
  for (let i = 0; i < n; i += 10)
    store.set("c", ownerOf(i), keyOf(i), "cd".repeat(32));
});
chunks = 0;
const flush2 = await time(() => store.flush());
const release = await time(() => {
  for (let c = 1; c <= characters / 2; c++) {
    live.delete(String(c));
    store.release("c", String(c));
  }
});

console.log(
  `${n.toLocaleString("en-US")} keys (${characters.toLocaleString("en-US")} characters): set ${set.toFixed(0)} ms (${per(set, n)}, ~${bytes.toFixed(0)} B/key), flush ${flush.toFixed(0)} ms (${flushChunks} upserts, ${rowsWritten.toLocaleString("en-US")} rows), cached get ${read.toFixed(0)} ms (${per(read, n)}), ${misses.toLocaleString("en-US")} read-through misses ${miss.toFixed(0)} ms, update 10 % ${update.toFixed(0)} ms + flush ${flush2.toFixed(0)} ms (${chunks} upserts), release half ${release.toFixed(0)} ms (${store.size.toLocaleString("en-US")} keys left, ${(seen / 64).toLocaleString("en-US")} reads answered, ${(sqlBytes / 1e6).toFixed(0)} M statement chars + values)`,
);
