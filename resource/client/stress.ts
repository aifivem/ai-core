import { onServerEvent } from "@aifivem/lib/client";
import { asArgs, readFinite } from "@aifivem/lib/shared";
import { CORE } from "@aifivem/shared";

/**
 * Stress for HUDs with QB's API (qb-hud, ps-hud, TGIANN HUDs): they take the player from the event's source, so the
 * server's stress layer asks this client to send it (`server/stress/registry.ts`).
 */
onServerEvent(
  CORE.stressRelayEvent,
  {
    args: ([v]) => {
      const amount = readFinite(v);
      return amount !== null && amount !== 0 && Math.abs(amount) <= 100
        ? asArgs(amount)
        : null;
    },
  },
  (amount) =>
    emitNet(
      amount > 0 ? "hud:server:GainStress" : "hud:server:RelieveStress",
      Math.abs(amount),
    ),
);
