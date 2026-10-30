import type { CharacterScreen, CreateCharacterInput } from "@aicore-fivem/shared";
import { NuiCallback } from "../../../../resource/common/nui";
import { fetchNui } from "../../lib/nui";
import { getState, update } from "./store";

/** Answers of the client are unknown: `ok`, or a lang key. */
function toResult(value: unknown): { ok: true; screen?: CharacterScreen } | { ok: false; error: string } {
  if (typeof value === "object" && value !== null) {
    const answer = value as { ok?: unknown; error?: unknown; screen?: unknown };
    if (answer.ok === true) return { ok: true, ...(answer.screen ? { screen: answer.screen as CharacterScreen } : {}) };
    if (typeof answer.error === "string") return { ok: false, error: answer.error };
  }
  return { ok: false, error: "CHAR_ERR_BUSY" };
}

/** Runs one server action with the busy flag on; the answer's error (a lang key) goes to the screen. */
async function run(call: () => Promise<unknown>): Promise<ReturnType<typeof toResult>> {
  if (getState().busy) return { ok: false, error: "CHAR_ERR_BUSY" };
  update({ busy: true, error: null });
  const result = toResult(await call().catch(() => null));
  update({ busy: false, error: result.ok ? null : result.error });
  return result;
}

/** Picks a card; the client moves the scene camera to that character. */
export function selectCard(characterId: number): void {
  update({ selected: characterId, view: { kind: "list" }, error: null });
  void fetchNui(NuiCallback.focus, characterId).catch(() => undefined);
}

export function play(characterId: number): Promise<unknown> {
  return run(() => fetchNui(NuiCallback.select, characterId));
}

export function create(input: CreateCharacterInput): Promise<unknown> {
  return run(() => fetchNui(NuiCallback.create, input));
}

export async function remove(characterId: number): Promise<void> {
  const result = await run(() => fetchNui(NuiCallback.remove, characterId));
  if (result.ok && result.screen) {
    const first = result.screen.characters[0]?.id ?? null;
    update({ screen: result.screen, selected: first, view: { kind: "list" } });
    if (first !== null) selectCard(first);
  }
}
