import {
  GlobalKey,
  onServerEvent,
  stateString,
  waitForEntity,
} from "@aicore-fivem/lib/client";
import { createLogger } from "@aicore-fivem/lib/shared";
import {
  GARAGES_CLIENT_EVENT,
  GARAGES_STATE_KEY,
  type GarageClientAdapter,
} from "@aicore-fivem/shared";
import { AdapterFollower } from "common/adapterFollower";
import { cdGarage } from "./adapters/cd_garage";
import { jgAdvancedGarages } from "./adapters/jg-advancedgarages";

/** Garage scripts with a client API (server list: `clientGarage` lines in `server/garages/registry.ts`). */
const ADAPTERS: readonly GarageClientAdapter[] = [jgAdvancedGarages, cdGarage];

/** The client half of the garage layer: follows the garage script the server picked (GlobalState). */
const layer = new AdapterFollower(
  ADAPTERS,
  new GlobalKey(GARAGES_STATE_KEY, stateString),
  createLogger("ai-core"),
);

type Action = "open" | "store" | "impound";
const ACTIONS: readonly string[] = ["open", "store", "impound"];

async function run(
  action: Action,
  netId: number | null,
  garage: string | null,
): Promise<void> {
  if (!layer.active) return;
  if (action === "open") {
    layer.call("open", (a) => a.open?.(garage), undefined);
    return;
  }
  const vehicle = netId !== null ? await waitForEntity(netId, 5000) : 0;
  if (!vehicle) return;
  if (action === "store")
    layer.call("store", (a) => a.store?.(vehicle, garage), undefined);
  else layer.call("impound", (a) => a.impound?.(vehicle), undefined);
}

onServerEvent(
  GARAGES_CLIENT_EVENT,
  {
    args: ([action, netId, garage]) =>
      typeof action === "string" &&
      ACTIONS.includes(action) &&
      (netId == null || typeof netId === "number") &&
      (garage == null || typeof garage === "string")
        ? ([
            action as Action,
            (netId as number | null) ?? null,
            (garage as string | null) ?? null,
          ] as const)
        : null,
  },
  (action, netId, garage) => run(action, netId, garage),
);
