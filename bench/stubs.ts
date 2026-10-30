// Natives the DB engine and ai-core's server code read, stubbed for bun. The connection is env.cfg's
// `mysql_connection_string` pointed at a separate database (`ai_core_stress`), never the server's own.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const STRESS_DB = "ai_core_stress";

const envCfg = readFileSync(
  join(import.meta.dir, "../../../../env.cfg"),
  "utf8",
);
const match = /set\s+mysql_connection_string\s+"([^"]+)"/.exec(envCfg);
if (!match?.[1]) throw new Error("mysql_connection_string missing in env.cfg");
/** The server's connection string with the database swapped (URI form `mysql://user:pass@host/db?opts`). */
export const connection = (database: string): string =>
  match[1]!.replace(/(mysql:\/\/[^/]+\/)[^?]*/, `$1${database}`);

const convars: Record<string, string> = {
  mysql_connection_string: connection(STRESS_DB),
  mysql_slow_query_warning: "100000",
  mysql_resultset_warning: "100000000",
  mysql_debug: "false",
};

const g = globalThis as Record<string, unknown>;
g.GetCurrentResourceName = () => "ai-core";
g.GetInvokingResource = () => "ai-core";
g.GetConvar = (name: string, fallback: string) => convars[name] ?? fallback;
g.GetConvarInt = (name: string, fallback: number) =>
  name in convars ? Number(convars[name]) : fallback;
// Registration natives the lib calls at import: no-ops here.
for (const name of [
  "on",
  "onNet",
  "emit",
  "emitNet",
  "RegisterCommand",
  "RegisterNetEvent",
  "AddEventHandler",
  "setTick",
  "clearTick",
  "TriggerEvent",
  "TriggerClientEvent",
  "ScheduleResourceTick",
])
  g[name] = () => undefined;
g.exports = () => undefined;

/** Milliseconds of `fn`. */
export async function time<T>(fn: () => Promise<T> | T): Promise<[T, number]> {
  const start = performance.now();
  const result = await fn();
  return [result, performance.now() - start];
}

export const fmt = (ms: number): string =>
  ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms.toFixed(1)} ms`;
