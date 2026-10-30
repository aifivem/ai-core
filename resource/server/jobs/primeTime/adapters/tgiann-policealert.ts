import { callExport } from "@aicore-fivem/lib/server";
import type { PrimeTimeAdapter } from "../registry";

const RESOURCE = "tgiann-policealert";

/**
 * tgiann-policealert (written from its 2.9 `server/editable.lua`): server export `IsPrimeTime(jobName?)`, true inside
 * `config.primeTime[jobName]` or `.default` of its `configs/config.lua`.
 */
export const tgiannPoliceAlert: PrimeTimeAdapter = {
  resource: RESOURCE,
  version: "2.9.0",
  isPrimeTime: (job) => callExport(RESOURCE, "IsPrimeTime", job) === true,
};
