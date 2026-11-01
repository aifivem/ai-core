import { isRecord } from "@aicore-fivem/lib/shared";
import type { CommandInfo, CommandParam } from "@aicore-fivem/shared";

/** Reads the command lists resources announce (`RegisterCommands`). */

const PARAM_TYPES = new Set(["number", "playerId", "string", "longString"]);

const text = (value: unknown, max: number): string =>
  typeof value === "string" ? value.slice(0, max) : "";
const names = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .filter(
          (n): n is string =>
            typeof n === "string" && /^[\w.:-]{1,64}$/.test(n),
        )
        .map((n) => n.toLowerCase())
    : [];

function readParam(value: unknown): CommandParam | null {
  if (
    !isRecord(value) ||
    typeof value.name !== "string" ||
    typeof value.type !== "string" ||
    !PARAM_TYPES.has(value.type)
  )
    return null;
  return {
    name: text(value.name, 32),
    type: value.type as CommandParam["type"],
    help: text(value.help, 120),
    optional: value.optional === true,
  };
}

export function readInfo(value: unknown): CommandInfo | null {
  if (!isRecord(value)) return null;
  const list = names(value.names);
  if (!list.length) return null;
  const params = Array.isArray(value.params)
    ? value.params.map(readParam).filter((p): p is CommandParam => p !== null)
    : [];
  const aces = Array.isArray(value.aces)
    ? value.aces.filter(
        (a): a is string => typeof a === "string" && /^[\w.:-]{1,64}$/.test(a),
      )
    : null;
  return { names: list, help: text(value.help, 200), params, aces };
}
