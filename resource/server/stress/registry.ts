import { resourceExport } from "@aicore-fivem/lib/server";
import { CORE } from "@aicore-fivem/shared";
import { players } from "../player/registry";

/** One HUD that keeps players' stress, hunger and thirst (ai-core's stress layer). */
export interface StressAdapter {
  resource: string;
  version?: string;
  /** Adds stress (a negative amount relieves it). */
  add(source: number, amount: number): void;
  /** Hunger and thirst to full. */
  refill(source: number): void;
  /** Adds hunger or thirst (0-100 scale; a negative amount takes it away). */
  addNeed(source: number, need: Need, amount: number): void;
}

export type Need = "hunger" | "thirst";

const hud = resourceExport("ai-hud");

/**
 * QB's way (qb-ambulancejob's revive): the metadata keys, then `hud:client:UpdateNeeds` for the HUD on the client.
 * Also the fallback without any HUD, so the next HUD reads full needs.
 */
export function refillMetadata(source: number): boolean {
  const player = players.get(source);
  if (!player) return false;
  player.setMeta("hunger", 100);
  player.setMeta("thirst", 100);
  TriggerClientEvent("hud:client:UpdateNeeds", source, 100, 100);
  return true;
}

/** QB's way for one need: the metadata key (0-100), then `hud:client:UpdateNeeds` with both values. Also the fallback without a HUD. */
export function addMetadataNeed(
  source: number,
  need: Need,
  amount: number,
): boolean {
  const player = players.get(source);
  if (!player) return false;
  const value = (key: Need): number => {
    const v = player.getMeta(key);
    return typeof v === "number" && Number.isFinite(v) ? v : 100;
  };
  player.setMeta(need, Math.min(100, Math.max(0, value(need) + amount)));
  TriggerClientEvent(
    "hud:client:UpdateNeeds",
    source,
    value("hunger"),
    value("thirst"),
  );
  return true;
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
  refill: (source) => void refillMetadata(source),
  addNeed: (source, need, amount) => void addMetadataNeed(source, need, amount),
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
    refill: (source) => {
      hud.SetNeed(source, "hunger", 100);
      hud.SetNeed(source, "thirst", 100);
    },
    addNeed: (source, need, amount) => hud.AddNeed(source, need, amount),
  },
];
