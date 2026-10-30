import { onServerEvent } from "@aicore-fivem/lib/client";
import { createLogger, waitFor } from "@aicore-fivem/lib/shared";
import { VEHICLE_KEYS_CLIENT_EVENT, VEHICLE_KEYS_STATE_KEY, type VehicleKeysClientAdapter } from "@aicore-fivem/shared";


const log = createLogger("ai-core");

/** Key systems with only a client API, one adapter file each (server list: `server/vehicleKeys/registry.ts`). */
const ADAPTERS: readonly VehicleKeysClientAdapter[] = [];

/** The client half of the vehicle key layer: follows the key system the server picked (GlobalState). */
class ClientKeys {
  private current: VehicleKeysClientAdapter | null = null;

  pick(resource: unknown): void {
    this.current = ADAPTERS.find((a) => a.resource === resource) ?? null;
  }

  async apply(action: "give" | "remove", netId: number, plate: string): Promise<void> {
    const adapter = this.current;
    if (!adapter) return;
    const vehicle = await waitFor(() => (NetworkDoesEntityExistWithNetworkId(netId) ? NetToVeh(netId) : undefined), 5000).catch(() => 0);
    if (!vehicle) return;
    try {
      adapter[action](vehicle, plate);
    } catch (error) {
      log.error(`${adapter.resource} ${action} key failed`, error);
    }
  }
}

const keys = new ClientKeys();
keys.pick(GlobalState[VEHICLE_KEYS_STATE_KEY]);
AddStateBagChangeHandler(VEHICLE_KEYS_STATE_KEY, "global", (_bag: string, _key: string, value: unknown) => keys.pick(value));

onServerEvent(
  VEHICLE_KEYS_CLIENT_EVENT,
  {
    args: ([action, netId, plate]) =>
      (action === "give" || action === "remove") && typeof netId === "number" && typeof plate === "string" ? ([action, netId, plate] as const) : null,
  },
  (action, netId, plate) => keys.apply(action, netId, plate),
);
