// Admin panel Players section at full server load (`bun --preload ./bench/preload.ts bench/adminPlayers.bench.ts`):
// natives stubbed, no database. Times and sizes the `online` snapshot (latent `rows` chunks) and the list deltas
// after a restart-like burst (capped flushes), with ai-core's real `PlayerWatchers`.
import { plugin } from "bun";
import { join } from "node:path";
import { kb, msgpackSize } from "./msgpackSize";

// `common/adminPlayers` as the resource's tsconfig maps it (the preload only maps bare `common`).
const adminPlayers = await import(
  join(import.meta.dir, "../resource/common/adminPlayers.ts")
);
plugin({
  name: "ai-core-common-files",
  setup(build) {
    build.module("common/adminPlayers", () => ({
      exports: adminPlayers,
      loader: "object",
    }));
  },
});

const g = globalThis as Record<string, unknown>;
const sent: { target: number; bytes: number }[] = [];
g.GetPlayerName = (s: string) => `Steam_Account_${s}`;
g.emitNet = (_name: string, target: number, ...args: unknown[]) =>
  sent.push({ target, bytes: msgpackSize(args) });
g.TriggerLatentClientEvent = (
  _name: string,
  target: number,
  _bps: number,
  ...args: unknown[]
) => sent.push({ target, bytes: msgpackSize(args) });
let pending: (() => void) | null = null;
g.setTimeout = (fn: () => void) => {
  pending = fn;
  return 1;
};

const { players } = await import("../resource/server/player/registry");
const { playerWatchers } =
  await import("../resource/server/admin/players/watchers");

const jobs = ["police", "ambulance", "mechanic", "taxi", "unemployed"];
function fakePlayer(i: number) {
  return {
    source: i,
    charId: 1_000_000 + i,
    citizenid: String(1_000_000 + i),
    fullName: `Firstname${i % 60} Lastname${i % 100}`,
    jobs: {
      current: () => ({ job: jobs[i % 5] ?? "unemployed", grade: i % 4 }),
      onDuty: () => (i % 3 === 0 ? jobs[i % 5] : null),
    },
  };
}

const time = (fn: () => unknown): number => {
  const t = performance.now();
  fn();
  return performance.now() - t;
};

for (const count of [2048, 10_000]) {
  for (let i = 1; i <= count; i++)
    players.add(fakePlayer(i) as unknown as Parameters<typeof players.add>[0]);
  sent.length = 0;
  // One admin opens the list: the snapshot goes out as latent chunks.
  const build = time(() => playerWatchers.watchList(1));
  const chunks = sent.length;
  const biggest = Math.max(...sent.map((e) => e.bytes));
  const total = sent.reduce((n, e) => n + e.bytes, 0);
  // Ten admins watch the list; every player changes once (a restart, a duty sweep): capped flushes.
  for (let a = 2; a <= 10; a++) playerWatchers.watchList(a);
  for (let i = 1; i <= count; i++) playerWatchers.put(i);
  sent.length = 0;
  let flushes = 0;
  const flush = time(() => {
    while (pending) {
      const run = pending;
      pending = null;
      run();
      flushes++;
    }
  });
  const perEvent = Math.max(...sent.map((e) => e.bytes));
  console.log(
    `${count.toLocaleString("en-US")} online: snapshot ${build.toFixed(1)} ms, ${kb(total)} in ${chunks} latent chunks (largest ${kb(biggest)}); burst of ${count} changes: ${flushes} flushes (${flush.toFixed(1)} ms), largest event ${kb(perEvent)}, ${sent.length} events to 10 admins`,
  );
  for (let a = 1; a <= 10; a++) playerWatchers.drop(a);
  for (const p of [...players.all()]) players.remove(p);
}
