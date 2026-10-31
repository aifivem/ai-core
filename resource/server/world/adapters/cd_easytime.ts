import { callExport } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import { toTime, type WeatherAdapter } from "../adapter";

/** cd_easytime `provide`s qb-weathersync without answering its exports: its own server exports, no blackout or freeze. */
const CD = "cd_easytime";
const cdData = (): Record<string, unknown> | null => {
  const d = callExport(CD, "GetAllData");
  return isRecord(d) ? d : null;
};

export const cdEasytime: WeatherAdapter = {
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
