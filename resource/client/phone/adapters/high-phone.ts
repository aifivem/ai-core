import { cache, PlayerState, stateBoolean } from "@aifivem/lib/client";
import type { PhoneClientAdapter } from "@aifivem/shared";

/** high-phone: player state bag `phone:open`, no open event or export (docs.high-scripts.com/phone/statebags/player). */
const openBag = new PlayerState("phone:open", stateBoolean);

export const highPhone: PhoneClientAdapter = {
  resource: "high-phone",
  watch: (opened) =>
    openBag.onChange((id, open, old) => {
      if (id === cache.serverId && open === true && old !== true) opened();
    }),
};
