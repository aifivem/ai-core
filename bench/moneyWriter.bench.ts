// Money writer at scale (`bun --preload ./bench/preload.ts bench/moneyWriter.bench.ts` in ai-core): ai-core's real
// `moneyWriter` with the transaction stubbed. The live path (`push`) must stay as cheap with `commit()` / `settled()`
// in the class as without them; `commit()` answers the batch's own outcome (a rolled-back batch answers false).
const g = globalThis as Record<string, unknown>;
g.GetCurrentResourceName = () => "ai-core";
g.GetConvar = (_name: string, fallback: string) => fallback;
g.GetConvarInt = (_name: string, fallback: number) => fallback;
g.on = () => undefined;

const { mysql } = await import("@aicore-fivem/mysql");
const { moneyWriter } = await import("../resource/server/money/writer");

let statements = 0;
let commitNext = true;
(mysql as { transaction: unknown }).transaction = async (
  queries: unknown[],
): Promise<boolean> => {
  statements += queries.length;
  return commitNext;
};

const per = (ms: number, n: number) => `${((ms * 1e6) / n).toFixed(0)} ns`;

for (const count of [100_000, 1_000_000]) {
  statements = 0;
  const t = performance.now();
  for (let i = 0; i < count; i++)
    moneyWriter.push({
      accountId: (i % 10_000) + 1,
      delta: 1,
      balanceAfter: i,
      reason: "bench",
      actor: null,
    });
  const push = performance.now() - t;
  const f = performance.now();
  await moneyWriter.idle();
  const flush = performance.now() - f;
  console.log(
    `${count.toLocaleString()} changes over 10k accounts: push ${push.toFixed(1)} ms (${per(push, count)} each), flush ${flush.toFixed(1)} ms, ${statements} statements`,
  );
}

// One offline write riding in a batch with 10k live changes: committed, then rolled back.
for (const ok of [true, false]) {
  commitNext = ok;
  for (let i = 0; i < 10_000; i++)
    moneyWriter.push({
      accountId: i + 1,
      delta: 1,
      balanceAfter: i,
      reason: "live",
      actor: null,
    });
  moneyWriter.push({
    accountId: 999_999,
    delta: 5,
    balanceAfter: 5,
    reason: "offline",
    actor: null,
  });
  const t = performance.now();
  const committed = await moneyWriter.commit();
  console.log(
    `commit() of a 10k-change batch (transaction ${ok ? "commits" : "rolls back"}): ${committed} in ${(performance.now() - t).toFixed(1)} ms`,
  );
}
commitNext = true;
const nothing = await moneyWriter.commit();
console.log(`commit() with nothing collecting: ${nothing}`);
process.exit(0);
