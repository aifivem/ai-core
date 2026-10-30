// Client error reports at scale (`bun bench/clientErrors.bench.ts`): ai-core's real `SourceMaps` (resource/server/
// sourceMaps.ts), natives stubbed. (1) What one real map costs to decode and hold. (2) What a hostile client gets from
// `ai-core:clientError` (rate 30 per minute): every distinct `@<name>/dist/client.js:L:C` in its text is looked up and
// cached by name, started or not, before the text is cut to 4,000 characters.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const RESOURCES = join(import.meta.dir, "../..");
const started = new Set(["ai-core", "ai-inventory", "ai-voice"]);
const g = globalThis as Record<string, unknown>;
g.GetCurrentResourceName = () => "ai-core";
g.on = () => undefined;
g.GetResourceState = (name: string) =>
  started.has(name) ? "started" : "missing";
g.LoadResourceFile = (name: string, file: string) => {
  try {
    return readFileSync(join(RESOURCES, name, file), "utf8");
  } catch {
    return null;
  }
};

const { sourceMaps } = await import("../resource/server/sourceMaps");
const maps = (sourceMaps as unknown as { maps: Map<string, unknown> }).maps;
const heap = () => process.memoryUsage().heapUsed / 1e6;

// (1) One real error line against ai-core's own map (387 KB), first (decode) and second (cached) time.
Bun.gc(true);
let before = heap();
let t = performance.now();
sourceMaps.resolve("Error\n    at @ai-core/dist/client.js:3:1200");
const decode = performance.now() - t;
t = performance.now();
sourceMaps.resolve("Error\n    at @ai-core/dist/client.js:3:1200");
const cached = performance.now() - t;
Bun.gc(true);
console.log(
  `real map (ai-core): first resolve ${decode.toFixed(1)} ms, cached ${(cached * 1000).toFixed(0)} µs, held ${(heap() - before).toFixed(1)} MB`,
);

// (2) Hostile reports: each carries as many distinct fake resource names as fit in the event.
for (const textKb of [16, 256]) {
  maps.clear();
  Bun.gc(true);
  before = heap();
  let next = 0;
  const report = (): string => {
    const parts: string[] = [];
    let size = 0;
    while (size < textKb * 1024) {
      const part = `@x${(next++).toString(36).padStart(10, "0")}${"y".repeat(40)}/dist/client.js:1:1\n`;
      parts.push(part);
      size += part.length;
    }
    return parts.join("");
  };
  const events = 30 * 60; // one hour at the gate's rate (30 per minute)
  t = performance.now();
  let worst = 0;
  for (let i = 0; i < events; i++) {
    const text = report();
    const s = performance.now();
    sourceMaps.resolve(text);
    worst = Math.max(worst, performance.now() - s);
  }
  const ms = performance.now() - t;
  Bun.gc(true);
  console.log(
    `hostile ${textKb} KB reports, 1 h at 30/min (${events} events): ${maps.size.toLocaleString("en-US")} cached names, +${(heap() - before).toFixed(0)} MB heap, ${(ms / events).toFixed(2)} ms per report (worst ${worst.toFixed(1)} ms)`,
  );
}
