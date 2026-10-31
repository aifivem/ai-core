import { resourceExport } from "@aicore-fivem/lib/server";
import { CORE } from "@aicore-fivem/shared";

/** One HUD that keeps players' stress (ai-core's stress layer). */
export interface StressAdapter {
  resource: string;
  version?: string;
  /** Adds stress (a negative amount relieves it). */
  add(source: number, amount: number): void;
}

const hud = resourceExport("ai-hud");

/**
 * QB's stress API (`hud:server:GainStress` / `RelieveStress`) takes the player from the event's source, so the
 * player's own client sends it (ai-core's client relay, `client/stress.ts`).
 */
const qbEvents = (resource: string, version?: string): StressAdapter => ({
  resource,
  version,
  add: (source, amount) =>
    TriggerClientEvent(CORE.stressRelayEvent, source, amount),
});

/**
 * Every HUD that keeps stress, in detection order: `auto` uses the first one running. ai-hud comes last: an installed
 * HUD replaces it. Calls per HUD: `docs/compat/stress.md`.
 */
export const STRESS_SYSTEMS: readonly StressAdapter[] = [
  // server/qb/qbserver.lua of each (only with tgiann-core's `config.framework = "qb"` and `config.stressActive`).
  qbEvents("tgiann-lumihud", "2.2.1"),
  qbEvents("tgiann-hudv2"),
  qbEvents("tgiann-modern-hud"),
  qbEvents("qb-hud", "2.2.0"),
  qbEvents("ps-hud", "2.1.2"),
  {
    resource: "ai-hud",
    add: (source, amount) => hud.AddNeed(source, "stress", amount),
  },
];
