// ai-voice's Enhanced router under a full bucket (`bun bench/voiceEnhanced.bench.ts`): the real EnhancedRouter with
// the voice natives stubbed and counted. Measures one player's range change to a new custom distance (what a client's
// `ai-voice:setRange` event with an unused value does) and to a panel range, with 2,048 and 10,000 players in bucket 0.
import { plugin } from "bun";

plugin({
  name: "ai-voice-common",
  setup(build) {
    build.module("common", () => ({
      exports: { ResourceName: "ai-voice" },
      loader: "object",
    }));
  },
});

const g = globalThis as Record<string, unknown>;
const calls: Record<string, number> = {};
let nextChannel = 0;
g.Citizen = {
  resultAsInteger: () => "int",
  invokeNative: (hash: string) => {
    calls[hash] = (calls[hash] ?? 0) + 1;
    return hash === "0x7A70A736" ? nextChannel++ : undefined;
  },
};
g.GetPlayerRoutingBucket = () => 0;
g.setInterval = () => 1;
g.clearInterval = () => undefined;
g.GetCurrentResourceName = () => "ai-voice";
// The lib's gate reads FiveM's `exports` and registers event handlers at import.
g.exports = new Proxy({}, { get: () => new Proxy({}, { get: () => () => null }) });
g.on = () => undefined;
g.onNet = () => undefined;
g.AddEventHandler = () => undefined;
g.IsDuplicityVersion = () => true;
g.GetGameTimer = () => Date.now();
g.AddStateBagChangeHandler = () => 0;
g.setTick = () => 1;
g.clearTick = () => undefined;

const { EnhancedRouter } = await import(
  "../../ai-voice/resource/server/enhanced"
);

const total = () => Object.values(calls).reduce((a, b) => a + b, 0);
const reset = () => {
  for (const k of Object.keys(calls)) delete calls[k];
};

for (const count of [2048, 10_000]) {
  const router = new EnhancedRouter(() => [1.5, 3, 6]);
  const talkers = Array.from({ length: count }, (_, i) => ({
    source: i + 1,
    distance: 3,
    muted: false,
  }));
  let t = performance.now();
  for (const talker of talkers) router.join(talker);
  const joinMs = performance.now() - t;
  reset();

  // One hostile client walks through custom ranges: each new value opens a channel for the whole bucket.
  const griefer = talkers[0]!;
  const steps = 20;
  t = performance.now();
  for (let i = 0; i < steps; i++) {
    griefer.distance = 7 + i * 0.37;
    router.update(griefer);
  }
  const customMs = (performance.now() - t) / steps;
  const customCalls = total() / steps;
  reset();

  t = performance.now();
  griefer.distance = 6;
  router.update(griefer);
  const panelMs = performance.now() - t;
  const panelCalls = total();
  reset();
  t = performance.now();
  griefer.distance = 3;
  router.update(griefer);
  const backMs = performance.now() - t;
  const backCalls = total();
  console.log(
    `${count.toLocaleString("en-US")} in bucket: join all ${joinMs.toFixed(0)} ms; new custom range ${customMs.toFixed(2)} ms and ${customCalls.toFixed(0)} native calls each (10/s allowed per client = ${(customCalls * 10).toFixed(0)} natives/s); first use of a panel range ${panelMs.toFixed(3)} ms, ${panelCalls} natives (channel made once); switch between existing ranges ${backMs.toFixed(3)} ms, ${backCalls} natives`,
  );
  router.stop();
}
