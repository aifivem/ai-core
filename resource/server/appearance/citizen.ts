import { mysql } from "@aicore-fivem/mysql";
import { players } from "../player/registry";

/** Helpers for clothing script adapters that key their rows by the framework id (the citizenid on ai-core's bridges). */

/** A character's citizenid, loaded or not; null for an unknown character. */
export async function citizenidOf(charId: number): Promise<string | null> {
  return (
    players.byCharacter(charId)?.citizenid ??
    (await mysql.scalar<string>(
      "SELECT citizenid FROM ai_core_characters WHERE id = ?",
      [charId],
    )) ??
    null
  );
}

/** A ped model from a clothing script's row: a hash (number or numeric text) or a model name; null when empty. */
export function modelOf(value: unknown): number | null {
  if (typeof value === "number")
    return Number.isInteger(value) && value !== 0 ? value | 0 : null;
  if (typeof value !== "string" || value === "") return null;
  return /^-?\d+$/.test(value) ? Number(value) | 0 : GetHashKey(value);
}
