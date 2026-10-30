import { callExport, registerExport } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import { AdapterPicker } from "common/adapters";
import { log } from "./log";

interface Time {
  hour: number;
  minute: number;
}

/** One weather script's answers; a missing setter means the script has no API for it (the call answers false). */
interface WeatherAdapter {
  readonly resource: string;
  getWeather(): string | null;
  setWeather(type: string): boolean;
  getTime(): Time | null;
  setTime(hour: number, minute: number): boolean;
  setBlackout?(on: boolean): boolean;
  freezeTime?(on: boolean): boolean;
}

const toTime = (hour: unknown, minute: unknown): Time | null =>
  typeof hour === "number"
    ? { hour, minute: typeof minute === "number" ? minute : 0 }
    : null;

/** qb-weathersync's export contract: ai-weathersync, qb-weathersync and Renewed-Weathersync answer it. */
const QB = "qb-weathersync";
const qb: WeatherAdapter = {
  resource: QB,
  getWeather: () => {
    const w = callExport(QB, "getWeatherState");
    return typeof w === "string" ? w : null;
  },
  setWeather: (type) => callExport(QB, "setWeather", type) !== false,
  getTime: () => {
    const t = callExport(QB, "getTime");
    return isRecord(t) ? toTime(t.hour, t.minute) : null;
  },
  setTime: (hour, minute) => callExport(QB, "setTime", hour, minute) !== false,
  setBlackout: (on) => callExport(QB, "setBlackout", on) !== false,
  freezeTime: (on) => callExport(QB, "setTimeFreeze", on) !== false,
};

/** cd_easytime `provide`s qb-weathersync without answering its exports: its own server exports, no blackout or freeze. */
const CD = "cd_easytime";
const cdData = (): Record<string, unknown> | null => {
  const d = callExport(CD, "GetAllData");
  return isRecord(d) ? d : null;
};
const cdEasytime: WeatherAdapter = {
  resource: CD,
  getWeather: () => {
    const w = cdData()?.weather;
    return typeof w === "string" ? w : null;
  },
  setWeather: (type) => callExport(CD, "SetWeather", type) === true,
  getTime: () => {
    const d = cdData();
    return d ? toTime(d.hours, d.mins) : null;
  },
  setTime: (hour, minute) => callExport(CD, "SetTime", hour, minute) === true,
};

/**
 * Time and weather through one API, whatever weather script runs, so admin tools and scripts never call a weather
 * script themselves and keep working when the owner swaps it. cd_easytime comes first: it `provide`s qb-weathersync.
 */
const weather = new AdapterPicker<WeatherAdapter>({
  category: "weather",
  adapters: [cdEasytime, qb],
  log,
  noneText: "no weather script runs: time and weather calls answer null",
});

registerExport("GetWeather", () =>
  weather.call("GetWeather", (a) => a.getWeather(), null),
);
registerExport(
  "SetWeather",
  (type: unknown) =>
    typeof type === "string" &&
    weather.call("SetWeather", (a) => a.setWeather(type.toUpperCase()), false),
);
registerExport("GetTime", () =>
  weather.call("GetTime", (a) => a.getTime(), null),
);
registerExport(
  "SetTime",
  (hour: unknown, minute?: unknown) =>
    typeof hour === "number" &&
    weather.call(
      "SetTime",
      (a) =>
        a.setTime(
          Math.floor(hour) % 24,
          typeof minute === "number" ? Math.floor(minute) % 60 : 0,
        ),
      false,
    ),
);
registerExport("SetBlackout", (on: unknown) =>
  weather.call(
    "SetBlackout",
    (a) => a.setBlackout?.(on === true) ?? false,
    false,
  ),
);
registerExport("FreezeTime", (on: unknown) =>
  weather.call(
    "FreezeTime",
    (a) => a.freezeTime?.(on === true) ?? false,
    false,
  ),
);
