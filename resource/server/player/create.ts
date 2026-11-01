import type {
  CharacterActionResult,
  CreateCharacterInput,
} from "@aicore-fivem/shared";
import { insertCharacter, listCharacters } from "../characters/repo";
import { coreLog } from "../logs";
import { BUSY, lock } from "./actionLock";
import { loadCharacter } from "./load";
import { selecting } from "./registry";
import { slotsOf } from "./screen";
import type { User } from "./users";

export type NewCharacter = Omit<CreateCharacterInput, "slot"> & {
  slot: number | null;
};

/** Creates a character on the account (slot limit; `slot` null = the first free one) and loads it. */
export async function createNow(
  source: number,
  user: User,
  input: NewCharacter,
): Promise<CharacterActionResult> {
  const characters = await listCharacters(user.id);
  const slots = slotsOf(user);
  const taken = new Set(characters.map((c) => c.slot));
  let slot = input.slot;
  for (let s = 1; slot === null && s <= slots; s++) if (!taken.has(s)) slot = s;
  if (slot === null || slot > slots || characters.length >= slots)
    return { ok: false, error: "CHAR_ERR_LIMIT" };
  if (taken.has(slot)) return { ok: false, error: "CHAR_ERR_SLOT_TAKEN" };
  const id = await insertCharacter(user.id, { ...input, slot });
  coreLog(
    "characters",
    `created ${input.firstname} ${input.lastname} in slot ${slot}`,
    { source, metadata: { charId: id } },
  );
  return loadCharacter(source, id);
}

/** A script creates and loads a character for a player without one (`CreateAndLoginCharacter`). */
export function createCharacterFor(
  source: number,
  input: NewCharacter,
): Promise<CharacterActionResult> {
  const user = selecting.get(source);
  if (!user) return Promise.resolve(BUSY);
  return lock.run(source, BUSY, () => createNow(source, user, input));
}
