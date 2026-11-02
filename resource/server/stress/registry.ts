import { resourceExport } from "@aifivem/lib/server";
import { CORE } from "@aifivem/shared";
import { needsStore } from "../needs/store";
import { players } from "../player/registry";

/** One HUD: it keeps players' stress and draws the hunger and thirst ai-core keeps (ai-core's HUD layer). */
export interface StressAdapter {
  resource: string;
  version?: string;
  /** Adds stress (a negative amount relieves it). */
  add(source: number, amount: number): void;
  /** Draws hunger and thirst after ai-core changed one (0-100). */
  showNeeds(source: number, hunger: number, thirst: number): void;
  /** Stress points that fade per minute, applied by ai-core's needs pass (asked once per pass); none = the HUD fades it. */
  relief?(): number;
}

const hud = resourceExport("ai-hud");

/** QB's way (qb-core's needs loop, qb-ambulancejob's revive): the HUD's client event with both values. */
export function qbShowNeeds(source: number, hunger: number, thirst: number) {
  TriggerClientEvent("hud:client:UpdateNeeds", source, hunger, thirst);
}

/**
 * QB's stress API (`hud:server:GainStress` / `RelieveStress`) takes the player from the event's source, so the
 * player's own client sends it (ai-core's client relay, `client/stress.ts`).
 */
const qbEvents = (resource: string, version?: string): StressAdapter => ({
  resource,
  version,
  add: (source, amount) =>
    TriggerClientEvent(CORE.stressRelayEvent, source, amount),
  showNeeds: qbShowNeeds,
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
    // ai-hud keeps the stress rules (sources, relief rate); ai-core writes the value with the other needs.
    resource: "ai-hud",
    add: (source, amount) => {
      const player = players.get(source);
      if (player) needsStore.add(player, "stress", amount);
    },
    // ai-hud draws from ai-core's player data (metadata deltas).
    showNeeds: () => undefined,
    relief: () => {
      const rate: unknown = hud.GetStressRelief();
      return typeof rate === "number" && Number.isFinite(rate)
        ? Math.min(10, Math.max(0, rate))
        : 0;
    },
  },
];
