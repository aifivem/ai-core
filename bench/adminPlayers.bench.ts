// Admin panel Players section at full server load (`bun --preload ./bench/preload.ts bench/adminPlayers.bench.ts`):
// natives stubbed, no database. Times and sizes the `online` snapshot (one callback answer, a plain reliable event)
// and the list delta after a restart-like burst, with ai-core's real `onlineRow` and `PlayerWatchers`.
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
let pending: (() => void) | null = null;
g.setTimeout = (fn: () => void) => {
  pending = fn;
  return 1;
};

const { players } = await import("../resource/server/player/registry");
const { onlineRow, playerWatchers } = await import(
  "../resource/server/admin/players/watchers"
);

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
  let rows: unknown[] = [];
  const build = time(() => {
    rows = [...players.all()].map(onlineRow);
  });
  const size = msgpackSize([1, true, rows]);
  // Ten admins watch the list; every player changes once (a restart, a duty sweep): one flush.
  for (let a = 1; a <= 10; a++) playerWatchers.watchList(a);
  for (let i = 1; i <= count; i++) playerWatchers.put(i);
  sent.length = 0;
  const flush = time(() => pending?.());
  const perAdmin = sent[0]?.bytes ?? 0;
  console.log(
    `${count.toLocaleString("en-US")} online: snapshot build ${build.toFixed(1)} ms, answer ${kb(size)} in one reliable event; list flush ${flush.toFixed(1)} ms, ${kb(perAdmin)} per admin x ${sent.length} admins`,
  );
  for (let a = 1; a <= 10; a++) playerWatchers.drop(a);
  for (const p of [...players.all()]) players.remove(p);
}
