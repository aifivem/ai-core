// BanStore at 100k and 1M active bans: add, a connection check (hit and miss), lift, page.
import { BanStore } from "../resource/server/bans/store";

const time = (label: string, fn: () => void): void => {
  const t = performance.now();
  fn();
  console.log(`${label}: ${(performance.now() - t).toFixed(1)} ms`);
};

for (const n of [100_000, 1_000_000]) {
  const store = new BanStore();
  const bans = Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    identifiers: {
      license: i.toString(16).padStart(40, "0"),
      fivem: String(i),
      discord: String(1e17 + i),
    },
    name: "",
    reason: "x",
    by: "bench",
    created: 0,
    expires: i % 2 ? null : Date.now() + 3_600_000,
  }));
  const before = process.memoryUsage().heapUsed;
  time(`${n} add`, () => {
    for (const ban of bans) store.add(ban);
  });
  console.log(
    `${n} heap: ${((process.memoryUsage().heapUsed - before) / 1048576).toFixed(0)} MB`,
  );
  const checks = 100_000;
  time(`${n} ${checks} checks (hit)`, () => {
    for (let i = 0; i < checks; i++)
      store.find({
        fivem: String((i * 7) % n),
        license: "nope",
        ip: "1.2.3.4",
      });
  });
  time(`${n} ${checks} checks (miss, 4 identifiers)`, () => {
    for (let i = 0; i < checks; i++)
      store.find({ fivem: "x", license: "y", discord: "z", ip: "1.2.3.4" });
  });
  time(`${n} 1000 lifts`, () => {
    for (let i = 0; i < 1000; i++) {
      const ban = store.get(i + 1);
      if (ban) store.remove(ban);
    }
  });
  time(`${n} page 1`, () => store.page(1));
}
