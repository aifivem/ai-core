import { callExport } from "@aicore-fivem/lib/server";
import { readTime, type WeatherAdapter } from "../adapter";

/** qb-weathersync's export contract: ai-weathersync, qb-weathersync and Renewed-Weathersync answer it. */
const QB = "qb-weathersync";

export const qbWeathersync: WeatherAdapter = {
  resource: QB,
  getWeather: () => {
    const w = callExport(QB, "getWeatherState");
    return typeof w === "string" ? w : null;
  },
  setWeather: (type) => callExport(QB, "setWeather", type) !== false,
  getTime: () => readTime(callExport(QB, "getTime")),
  setTime: (hour, minute) => callExport(QB, "setTime", hour, minute) !== false,
  setBlackout: (on) => callExport(QB, "setBlackout", on) !== false,
  freezeTime: (on) => callExport(QB, "setTimeFreeze", on) !== false,
};
