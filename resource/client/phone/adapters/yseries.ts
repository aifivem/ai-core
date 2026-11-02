import { PlayerState, stateBoolean } from "@aifivem/lib/client";
import type { PhoneClientAdapter } from "@aifivem/shared";
import { onOwnOpen } from "../ownState";

/** yseries (TeamsGG): player state bag `phoneOpen` (teamsgg.dev/docs/paid-scripts/phone/state-bags). */
const open = new PlayerState("phoneOpen", stateBoolean);

export const ySeries: PhoneClientAdapter = {
  resource: "yseries",
  watch: (opened) => onOwnOpen(open, opened),
};
