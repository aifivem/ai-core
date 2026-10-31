import type { MedicalAdapter } from "@aicore-fivem/shared";
import { players } from "../../player/registry";

/**
 * brutal_ambulancejob: its server keeps QB's `isdead` metadata (with `Config.Core = "QBCORE"`; its ESX mode keeps
 * nothing the server can read) and revives through the client event `brutal_ambulancejob:revive`. It has no heal
 * trigger (`brutal_ambulancejob:server:heal` is a hook it fires), so heal does nothing.
 */
const isDead = (source: number) =>
  players.get(source)?.getMeta("isdead") === true;

export const brutalAmbulance: MedicalAdapter = {
  resource: "brutal_ambulancejob",
  version: "1.3.1",
  revive: (source) => {
    const was = isDead(source);
    emitNet("brutal_ambulancejob:revive", source);
    return was;
  },
  heal: () => undefined,
  isDead,
};
