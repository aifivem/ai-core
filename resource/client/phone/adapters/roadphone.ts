import { isRecord } from "@aifivem/lib/shared";
import { PlayerState } from "@aifivem/lib/client";
import type { PhoneClientAdapter } from "@aifivem/shared";
import { onOwnOpen } from "../ownState";

/** roadphone (RoadPhone Pro): player state bag `roadphoneStatus`, field `open` (docs.roadshop.org/roadphonepro/api/server.md, Phone Status). */
const open = new PlayerState("roadphoneStatus", (v) =>
  isRecord(v) ? v.open === true : undefined,
);

export const roadPhone: PhoneClientAdapter = {
  resource: "roadphone",
  watch: (opened) => onOwnOpen(open, opened),
};
