import { callExport } from "@aifivem/lib/client";
import type { PhoneClientAdapter } from "@aifivem/shared";

/**
 * roadphone (RoadPhone Pro): client export `isPhoneOpen()`; its documented `roadphone:use` opens the phone (an item
 * use), it is not fired on a key open (docs.roadshop.org/roadphonepro/api/client.md, api/clientevents.md).
 */
export const roadPhone: PhoneClientAdapter = {
  resource: "roadphone",
  isOpen: () => callExport("roadphone", "isPhoneOpen") === true,
};
