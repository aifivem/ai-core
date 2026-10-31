import type { AppearanceClientAdapter } from "@aicore-fivem/shared";

/**
 * qb-clothing 1.2.0 (client.lua): its local event `qb-clothing:client:loadPlayerClothing (skin, ped)` dresses any
 * ped; it has no export that reads a ped's look.
 */
export const qbClothing: AppearanceClientAdapter = {
  resource: "qb-clothing",
  version: "1.2.0",
  apply: (ped, data) =>
    emit("qb-clothing:client:loadPlayerClothing", data, ped),
};
