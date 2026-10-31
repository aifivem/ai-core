import { callExport } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import { toTime, type WeatherAdapter } from "../adapter";

/**
 * av_weather: weather per zone (`getZone(name)` / `updateZone(name, weather, freeze)`; ai-core reads Los Santos and sets
 * every zone, keeping each zone's freeze), time through `getTime()` (`{ hour, minutes }`) /
 * `updateTime(hour, minute, freeze, instant)` and `setBlackout(on)`. It has no "is time frozen" getter: setting the
 * time unfreezes it.
 */
const AV = "av_weather";
const ZONES = ["santos", "sandy", "paleto", "cayo"] as const;
const zone = (name: string): Record<string, unknown> | null => {
  const z = callExport(AV, "getZone", name);
  return isRecord(z) ? z : null;
};
const getTime = () => {
  const t = callExport(AV, "getTime");
  return isRecord(t) ? toTime(t.hour, t.minutes) : null;
};

export const avWeather: WeatherAdapter = {
  resource: AV,
  getWeather: () => {
    const w = zone("santos")?.weather;
    return typeof w === "string" ? w : null;
  },
  setWeather: (type) => {
    let set = false;
    for (const name of ZONES) {
      const z = zone(name);
      if (!z) continue;
      callExport(AV, "updateZone", name, type, z.freeze === true);
      set = true;
    }
    return set;
  },
  getTime,
  setTime: (hour, minute) => {
    callExport(AV, "updateTime", hour, minute, false, true);
    return true;
  },
  setBlackout: (on) => {
    callExport(AV, "setBlackout", on);
    return true;
  },
  freezeTime: (on) => {
    const t = getTime();
    if (!t) return false;
    callExport(AV, "updateTime", t.hour, t.minute, on, true);
    return true;
  },
};
