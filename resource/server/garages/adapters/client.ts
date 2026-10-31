import { GARAGES_CLIENT_EVENT, type GarageAdapter } from "@aicore-fivem/shared";

/**
 * A garage script whose actions run on a player's client: the server half sends them to that player, where ai-core's
 * client adapter of the same resource (`resource/client/garages/adapters/`) calls the script. `impound` and `store`
 * need the acting player (`by`).
 */
export function clientGarage(
  resource: string,
  actions: { open?: true; store?: true; impound?: true },
): GarageAdapter {
  const send = (
    source: number,
    action: string,
    vehicle: number,
    garage: string | null,
  ) =>
    emitNet(
      GARAGES_CLIENT_EVENT,
      source,
      action,
      vehicle ? NetworkGetNetworkIdFromEntity(vehicle) : null,
      garage,
    );
  return {
    resource,
    ...(actions.open && {
      open: (source: number, garage: string | null) => {
        send(source, "open", 0, garage);
        return true;
      },
    }),
    ...(actions.store && {
      store: (
        vehicle: number,
        _plate: string,
        garage: string | null,
        by: number | null,
      ) => {
        if (by === null) return false;
        send(by, "store", vehicle, garage);
        return true;
      },
    }),
    ...(actions.impound && {
      impound: (vehicle: number, _plate: string, by: number | null) => {
        if (by === null) return false;
        send(by, "impound", vehicle, null);
        return true;
      },
    }),
  };
}
