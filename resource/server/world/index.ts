import { registerExport } from "@aicore-fivem/lib/server";
import { AdapterPicker } from "common/adapters";
import { log } from "../log";
import type { WeatherAdapter } from "./adapter";
import { avWeather } from "./adapters/av_weather";
import { cdEasytime } from "./adapters/cd_easytime";
import { qbWeathersync } from "./adapters/qb-weathersync";
import { renewedWeathersync } from "./adapters/Renewed-Weathersync";

/**
 * Every supported weather script in detection order: the first running one answers. Renewed-Weathersync and
 * cd_easytime come before qb-weathersync: both `provide` it (Renewed provides cd_easytime too, so it comes first).
 * A new weather script = one adapter file and one line here.
 */
const WEATHER_SYSTEMS: readonly WeatherAdapter[] = [
  renewedWeathersync,
  avWeather,
  cdEasytime,
  qbWeathersync,
];

/**
 * Time and weather through one API, whatever weather script runs, so admin tools and scripts never call a weather
 * script themselves and keep working when the owner swaps it.
 */
const weather = new AdapterPicker<WeatherAdapter>({
  category: "weather",
  adapters: WEATHER_SYSTEMS,
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
