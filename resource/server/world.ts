import {
  callExport,
  isResourceStarted,
  registerExport,
} from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";

/**
 * Time and weather through one API, whatever weather script runs: qb-weathersync's exports are the common contract
 * (ai-weathersync, qb-weathersync and Renewed-Weathersync answer them), so admin tools and scripts never call a
 * weather script themselves and keep working when the owner swaps it.
 */
const SYSTEM = "qb-weathersync";

function call(name: string, ...args: unknown[]): unknown {
  if (!isResourceStarted(SYSTEM)) return undefined;
  try {
    return callExport(SYSTEM, name, ...args);
  } catch {
    return undefined;
  }
}

registerExport("GetWeather", () => {
  const w = call("getWeatherState");
  return typeof w === "string" ? w : null;
});
registerExport(
  "SetWeather",
  (type: unknown) =>
    typeof type === "string" &&
    call("setWeather", type.toUpperCase()) !== false &&
    isResourceStarted(SYSTEM),
);
registerExport("GetTime", () => {
  const t = call("getTime");
  return isRecord(t) && typeof t.hour === "number"
    ? { hour: t.hour, minute: typeof t.minute === "number" ? t.minute : 0 }
    : null;
});
registerExport(
  "SetTime",
  (hour: unknown, minute?: unknown) =>
    typeof hour === "number" &&
    call(
      "setTime",
      Math.floor(hour) % 24,
      typeof minute === "number" ? Math.floor(minute) % 60 : 0,
    ) !== false &&
    isResourceStarted(SYSTEM),
);
registerExport(
  "SetBlackout",
  (on: unknown) =>
    call("setBlackout", on === true) !== false && isResourceStarted(SYSTEM),
);
registerExport(
  "FreezeTime",
  (on: unknown) =>
    call("setTimeFreeze", on === true) !== false && isResourceStarted(SYSTEM),
);
