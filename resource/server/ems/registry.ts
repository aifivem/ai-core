import type { EmsAdapter } from "@aicore-fivem/shared";
import { tgiannPoliceAlertEms } from "./adapters/tgiann-policealert";
import { wasabiAmbulanceV2Ems } from "./adapters/wasabi_ambulance_v2";

/**
 * Every supported EMS source in detection order: `auto` uses the first one running, ai-core's own part (duty counts,
 * alerts through the dispatch layer; resource "ai-core") after all of them and for whatever the active one lacks.
 * A new EMS script = one adapter file and one line here.
 */
export const EMS_SCRIPTS: readonly EmsAdapter[] = [
  tgiannPoliceAlertEms,
  wasabiAmbulanceV2Ems,
];

/** The panel choices: the scripts, then ai-core's own part. */
export const EMS_CHOICES = [...EMS_SCRIPTS.map((a) => a.resource), "ai-core"];
