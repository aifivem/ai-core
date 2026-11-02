import { callExport } from "@aifivem/lib/client";
import type { PhoneClientAdapter } from "@aifivem/shared";

/** yseries (TeamsGG): client export `IsOpen()`, no client events (teamsgg.dev/docs/paid-scripts/phone/exports/client-side/general). */
export const ySeries: PhoneClientAdapter = {
  resource: "yseries",
  isOpen: () => callExport("yseries", "IsOpen") === true,
};
