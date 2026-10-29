import { createLogger } from "@aicore-fivem/lib/shared";
import { collectQueryStats } from "@aicore-fivem/mysql";
import { players } from "./player/registry";
import { switchCharacter } from "./player/session";

/**
 * Developer test commands (restricted: group.admin), only until the admin panel covers these. Players never use
 * commands. Each acts on the caller, or on `id` (server id) when given.
 */
const log = createLogger("ai-core:dev");

function target(source: number, raw: string | undefined): number {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : source;
}

/** The answer goes to the server console (chat may not run); the caller sees it there or in txAdmin's live console. */
function reply(source: number, text: string): void {
  log.info(`${source > 0 ? `src ${source}: ` : ""}${text}`);
}

RegisterCommand(
  "aicore_switch",
  (source: number, args: string[]) => {
    reply(source, switchCharacter(target(source, args[0])) ? "switched" : "no character");
  },
  true,
);

RegisterCommand(
  "aicore_job",
  (source: number, args: string[]) => {
    const player = players.get(target(source, args[2]));
    const result = player?.jobs.set(args[0] ?? "", Number(args[1] ?? 0));
    reply(source, result ? JSON.stringify(result) : "no character");
  },
  true,
);

RegisterCommand(
  "aicore_duty",
  (source: number, args: string[]) => {
    const player = players.get(target(source, args[1]));
    const job = args[0] && args[0] !== "off" ? args[0] : null;
    reply(source, player ? JSON.stringify(player.jobs.setDuty(job)) : "no character");
  },
  true,
);

RegisterCommand(
  "aicore_money",
  (source: number, args: string[]) => {
    const player = players.get(target(source, args[2]));
    const result = player?.wallet.change(args[0] ?? "", Number(args[1] ?? 0), "DEV_COMMAND", `src:${source}`);
    reply(source, result ? JSON.stringify(result) : "no character");
  },
  true,
);

RegisterCommand(
  "aicore_gang",
  (source: number, args: string[]) => {
    const player = players.get(target(source, args[2]));
    const result = player?.gangs.set(args[0] ?? "", Number(args[1] ?? 0));
    reply(source, result ? JSON.stringify(result) : "no character");
  },
  true,
);

/** Database statistics of every resource (queries, time, slow ones); `aicore_db slow` lists recent slow queries. */
RegisterCommand(
  "aicore_db",
  (source: number, args: string[]) => {
    void collectQueryStats().then((reports) => {
      for (const r of reports) {
        const avg = r.queries ? (r.totalMs / r.queries).toFixed(2) : "0";
        reply(source, `${r.resource}: ${r.queries} queries, ${r.totalMs.toFixed(0)} ms total, avg ${avg} ms, ${r.slow} slow, ${r.errors} errors`);
        if (args[0] === "slow") for (const q of r.recentSlow.slice(-5)) reply(source, `  ${q.ms} ms  ${q.sql}`);
      }
    });
  },
  true,
);
