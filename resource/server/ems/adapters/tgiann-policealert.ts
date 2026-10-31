import { callExport } from "@aicore-fivem/lib/server";
import type { EmsAdapter } from "@aicore-fivem/shared";

/**
 * tgiann-policealert (written from its 2.10.0 source, `server/personalList.lua`): `GetAvailablePersonalCount(jobs)`
 * counts on-duty personnel of its employee-list jobs (`config.empoloyeeListJobs`, police and ambulance by default)
 * who are not busy (Code 7). A job outside that list counts 0. Distress calls go through ai-core's dispatch layer,
 * which uses tgiann-policealert itself when it is the alert system.
 */
export const tgiannPoliceAlertEms: EmsAdapter = {
  resource: "tgiann-policealert",
  version: "2.10.0",
  available: (jobs) => {
    const raw: unknown = callExport(
      "tgiann-policealert",
      "GetAvailablePersonalCount",
      [...jobs],
    );
    return typeof raw === "number" && raw > 0 ? raw : 0;
  },
};
