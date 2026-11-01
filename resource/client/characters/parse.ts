import { isRecord, readId } from "@aicore-fivem/lib/shared";
import {
  toCharacterAppearance,
  type CharacterActionResult,
  type CharacterAppearance,
  type SpawnPoint,
} from "@aicore-fivem/shared";

/** What the server sends the character screen, read into the shapes the screen accepts. */

export const BUSY: CharacterActionResult = {
  ok: false,
  error: "CHAR_ERR_BUSY",
};

/** Answers of the server are unknown: this is the only shape the screen accepts. */
export function toResult(value: unknown): CharacterActionResult {
  if (isRecord(value) && value.ok === true) return { ok: true };
  if (isRecord(value) && typeof value.error === "string")
    return { ok: false, error: value.error };
  return BUSY;
}

/** The looks of the cards (`characterLooksEvent`): valid entries only. */
export function toLooks(
  raw: unknown,
): [Array<{ id: number; look: CharacterAppearance }>] | null {
  return Array.isArray(raw)
    ? [
        raw.flatMap((entry: unknown) => {
          const id = isRecord(entry) ? readId(entry.id) : null;
          const look = isRecord(entry)
            ? toCharacterAppearance(entry.look)
            : null;
          return id !== null && look ? [{ id, look }] : [];
        }),
      ]
    : null;
}

/** The spawn point the server sends: finite coordinates, a model name, the armour (0-100) and the health (0 = full). */
export function toSpawn(value: unknown): [SpawnPoint] | null {
  if (!isRecord(value) || typeof value.model !== "string") return null;
  const { x, y, z, heading, armour, health } = value;
  const finite = (n: unknown): n is number =>
    typeof n === "number" && Number.isFinite(n);
  return finite(x) && finite(y) && finite(z) && finite(heading)
    ? [
        {
          x,
          y,
          z,
          heading,
          model: value.model,
          armour: finite(armour) ? Math.min(100, Math.max(0, armour)) : 0,
          health: finite(health) && health > 100 ? health : 0,
        },
      ]
    : null;
}
