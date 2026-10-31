import { isRecord } from "@aicore-fivem/lib/shared";

export interface Time {
  hour: number;
  minute: number;
}

/** One weather script's answers; a missing setter means the script has no API for it (the call answers false). */
export interface WeatherAdapter {
  readonly resource: string;
  readonly version?: string;
  getWeather(): string | null;
  setWeather(type: string): boolean;
  getTime(): Time | null;
  setTime(hour: number, minute: number): boolean;
  setBlackout?(on: boolean): boolean;
  freezeTime?(on: boolean): boolean;
}

export const toTime = (hour: unknown, minute: unknown): Time | null =>
  typeof hour === "number"
    ? { hour, minute: typeof minute === "number" ? minute : 0 }
    : null;

/** A `getTime` answer: `{ hour, minute }`, or Lua's two return values `hour, minute` (an array in JS). */
export const readTime = (value: unknown): Time | null =>
  Array.isArray(value)
    ? toTime(value[0], value[1])
    : isRecord(value)
      ? toTime(value.hour, value.minute)
      : null;
