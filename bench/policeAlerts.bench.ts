// ai-policealert's AlertBoard at full load (`bun bench/policeAlerts.bench.ts`): the real board with the lib `online`
// mirror fed by a stubbed ai-core. 2,048 online with 1 in 10 on police duty. Measures one alert's fan-out and the
// duty snapshot an officer gets when many alerts are live (shot alerts allow one per 150 m area per 30 s).
import { plugin } from "bun";
import { join } from "node:path";
import { kb, msgpackSize } from "./msgpackSize";

const g = globalThis as Record<string, unknown>;
const handlers = new Map<string, (...args: unknown[]) => void>();
g.GetCurrentResourceName = () => "ai-policealert";
g.on = (name: string, fn: (...args: unknown[]) => void) =>
  handlers.set(name, fn);
g.onNet = () => undefined;
g.GetConvar = (_n: string, f: string) => f;
g.GetConvarInt = (_n: string, f: number) => f;
g.AddEventHandler = () => undefined;
g.RegisterNetEvent = () => undefined;
g.RegisterCommand = () => undefined;
let online = 2048;
g.GetNumPlayerIndices = () => online;
g.GetPlayerFromIndex = (i: number) => String(i + 1);
g.GetPlayerName = (s: string) => `p${s}`;
g.GetGameTimer = () => Date.now();
const sent: { target: number; bytes: number }[] = [];
g.emitNet = (_n: string, target: number, ...args: unknown[]) =>
  sent.push({ target, bytes: msgpackSize(args) });
const duty = (s: number) => (s % 10 === 0 ? "police" : null);
g.exports = {
  "ai-core": {
    GetLoadedSources: () => Array.from({ length: online }, (_, i) => i + 1),
    GetCharacter: (s: number) => ({ id: s, citizenid: String(s), slot: 1, firstname: "A", lastname: "B", birthdate: "1990-01-01", sex: "male" }),
    GetJobs: (s: number) => [{ job: duty(s) ?? "unemployed", grade: 0 }],
    GetGangs: () => [],
    GetDutyJob: duty,
  },
};

const common = await import(
  join(import.meta.dir, "../../ai-policealert/resource/common/alerts.ts")
);
// Only `online` and `registerExport` of the lib's server index: the index pulls modules that need more natives.
const { online: onlineMirror } = await import(
  join(import.meta.dir, "../../../../packages/lib/src/server/online.ts")
);
plugin({
  name: "ai-policealert-common",
  setup(build) {
    build.module("common/alerts", () => ({ exports: common, loader: "object" }));
    build.module("@aicore-fivem/lib/server", () => ({
      exports: {
        online: onlineMirror,
        registerExport: () => undefined,
        // A Map without the drop listener (no players drop in the bench).
        PlayerMap: class<V> extends Map<number, V> {},
      },
      loader: "object",
    }));
  },
});

const { AlertBoard } = await import(
  "../../ai-policealert/resource/server/alerts"
);
const alert = (i: number) => ({
  code: "10-71",
  title: "Shots fired",
  coords: { x: i, y: i * 2, z: 30.5 },
  jobs: ["police"],
  source: i,
  icon: "gun",
  blip: { sprite: 110, color: 1 },
  priority: "high" as const,
});

for (const live of [100, 1_000, 5_000]) {
  const board = new AlertBoard(() => ({ jobs: ["police"], alertSeconds: 600 }));
  sent.length = 0;
  let t = performance.now();
  for (let i = 0; i < live; i++) board.add(alert(i));
  const perAdd = (performance.now() - t) / live;
  const events = sent.length / live;
  sent.length = 0;
  t = performance.now();
  board.dutyChanged(10, "police");
  const snap = performance.now() - t;
  console.log(
    `${live.toLocaleString("en-US")} live alerts, ${Math.floor(online / 10)} officers: add ${(perAdd * 1000).toFixed(0)} µs and ${events.toFixed(0)} events each; duty snapshot ${snap.toFixed(1)} ms, ${kb(sent[0]?.bytes ?? 0)} in one reliable event`,
  );
}
