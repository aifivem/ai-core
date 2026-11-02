import { getPlayerData, onPlayerData } from "@aifivem/lib/client";
import type { MedicalClientAdapter } from "@aifivem/shared";

/** qb-ambulancejob: QB's `isdead` / `inlaststand` metadata on the player's own data. */
export const qbAmbulance: MedicalClientAdapter = {
  resource: "qb-ambulancejob",
  isDead: () => {
    const meta = getPlayerData("metadata");
    return meta?.isdead === true || meta?.inlaststand === true;
  },
  watch: (changed) => void onPlayerData("metadata", changed),
};
