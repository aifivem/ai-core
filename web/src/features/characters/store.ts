import { useSyncExternalStore } from "react";
import type { CharacterScreen } from "@aicore-fivem/shared";

/** The character screen's state: the server's snapshot plus what the player picked. */
export type View =
  | { kind: "list" }
  | { kind: "create"; slot: number }
  | { kind: "delete"; characterId: number };

export interface ScreenState {
  open: boolean;
  screen: CharacterScreen | null;
  selected: number | null;
  view: View;
  busy: boolean;
  error: string | null;
  /** Portrait image urls by character id (sent by an appearance resource, may be missing). */
  portraits: Record<number, string>;
  /** The game's scene with the characters stands behind the screen; without it the background picture shows. */
  scene: boolean;
  /** A character was picked: the screen fades out while the game fades to black, then closes. */
  leaving: boolean;
}

let state: ScreenState = {
  open: false,
  screen: null,
  selected: null,
  view: { kind: "list" },
  busy: false,
  error: null,
  portraits: {},
  scene: false,
  leaving: false,
};
const listeners = new Set<() => void>();

export function update(patch: Partial<ScreenState>): void {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

export function getState(): ScreenState {
  return state;
}

export function useScreen(): ScreenState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}
