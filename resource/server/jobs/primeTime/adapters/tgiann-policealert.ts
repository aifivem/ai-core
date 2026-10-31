import { callExport } from "@aicore-fivem/lib/server";
import type { PrimeTimeAdapter } from "../registry";

const RESOURCE = "tgiann-policealert";

/**
 * tgiann-policealert (written from its 2.10 `server/editable.lua`): its global `isPrimeTime(jobName?)`, true inside
 * `config.primeTime[jobName]` or `.default` of its `configs/config.lua`. Stock 2.9 / 2.10 do not export it: the
 * owner adds `exports("IsPrimeTime", isPrimeTime)` under it (`docs/compat/prime-time.md`).
 */
export const tgiannPoliceAlert: PrimeTimeAdapter = {
  resource: RESOURCE,
  version: "2.10.0",
  isPrimeTime: (job) => callExport(RESOURCE, "IsPrimeTime", job) === true,
};
