import { addCommand } from "@aicore-fivem/lib/server";
import { createLogger } from "@aicore-fivem/lib/shared";
import { collectQueryStats } from "@aicore-fivem/mysql";
import { Locale } from "common";
import { players } from "./player/registry";
import { switchCharacter } from "./player/session";

/**
 * Developer test commands (ai-core admins), only until the admin panel covers these. Players never use commands.
 * Each acts on the caller, or on `id` (server id) when given.
 */
const log = createLogger("ai-core:dev");

/** The answer goes to the server console (chat may not run); the caller sees it there or in txAdmin's live console. */
function reply(source: number, text: string): void {
  log.info(`${source > 0 ? `src ${source}: ` : ""}${text}`);
}

const id = { name: "id", type: "playerId", help: Locale("COMMAND_P_ID"), optional: true } as const;
const result = (value: unknown): string => (value ? JSON.stringify(value) : "no character");

addCommand("aicore_switch", { help: Locale("COMMAND_AICORE_SWITCH"), restricted: true, params: [id] }, (source, args) => {
  reply(source, switchCharacter(args.id ?? source) ? "switched" : "no character");
});

addCommand(
  "aicore_job",
  {
    help: Locale("COMMAND_AICORE_JOB"),
    restricted: true,
    params: [{ name: "job", type: "string", help: Locale("COMMAND_P_JOB") }, { name: "grade", type: "number", help: Locale("COMMAND_P_GRADE") }, id],
  },
  (source, args) => reply(source, result(players.get(args.id ?? source)?.jobs.set(args.job, args.grade))),
);

addCommand(
  "aicore_duty",
  { help: Locale("COMMAND_AICORE_DUTY"), restricted: true, params: [{ name: "job", type: "string", help: Locale("COMMAND_P_DUTY") }, id] },
  (source, args) => reply(source, result(players.get(args.id ?? source)?.jobs.setDuty(args.job === "off" ? null : args.job))),
);

addCommand(
  "aicore_money",
  {
    help: Locale("COMMAND_AICORE_MONEY"),
    restricted: true,
    params: [{ name: "account", type: "string", help: Locale("COMMAND_P_ACCOUNT") }, { name: "amount", type: "number", help: Locale("COMMAND_P_AMOUNT") }, id],
  },
  (source, args) => reply(source, result(players.get(args.id ?? source)?.wallet.change(args.account, args.amount, "DEV_COMMAND", `src:${source}`))),
);

addCommand(
  "aicore_gang",
  {
    help: Locale("COMMAND_AICORE_GANG"),
    restricted: true,
    params: [{ name: "gang", type: "string", help: Locale("COMMAND_P_GANG") }, { name: "grade", type: "number", help: Locale("COMMAND_P_GRADE") }, id],
  },
  (source, args) => reply(source, result(players.get(args.id ?? source)?.gangs.set(args.gang, args.grade))),
);

/** Database statistics of every resource (queries, time, slow ones); `aicore_db slow` lists recent slow queries. */
addCommand(
  "aicore_db",
  { help: Locale("COMMAND_AICORE_DB"), restricted: true, params: [{ name: "slow", type: "string", help: Locale("COMMAND_P_SLOW"), optional: true }] },
  async (source, args) => {
    for (const r of await collectQueryStats()) {
      const avg = r.queries ? (r.totalMs / r.queries).toFixed(2) : "0";
      reply(source, `${r.resource}: ${r.queries} queries, ${r.totalMs.toFixed(0)} ms total, avg ${avg} ms, ${r.slow} slow, ${r.errors} errors`);
      if (args.slow === "slow") for (const q of r.recentSlow.slice(-5)) reply(source, `  ${q.ms} ms  ${q.sql}`);
    }
  },
);
