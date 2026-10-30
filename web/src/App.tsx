import { useCallback, useEffect } from "react";
import { NuiCallback, NuiMessage } from "../../resource/common/nui";
import { CharacterScreen } from "./features/characters/CharacterScreen";
import {
  openScreen,
  toOpenPayload,
  toPortraits,
} from "./features/characters/openScreen";
import { getState, update } from "./features/characters/store";
import { fetchNui, useNuiMessage } from "./lib/nui";

export function App() {
  const onOpen = useCallback((data: unknown) => {
    const payload = toOpenPayload(data);
    if (payload) openScreen(payload);
  }, []);
  const onClose = useCallback(
    () => update({ open: false, busy: false, error: null, leaving: false }),
    [],
  );
  const onLeave = useCallback(() => update({ leaving: true }), []);

  useNuiMessage(NuiMessage.openCharacters, onOpen);
  const onPortrait = useCallback((data: unknown) => {
    const { id, url } =
      typeof data === "object" && data !== null
        ? (data as { id?: unknown; url?: unknown })
        : {};
    const portrait = toPortraits(typeof id === "number" ? { [id]: url } : null);
    if (Object.keys(portrait).length)
      update({ portraits: { ...getState().portraits, ...portrait } });
  }, []);

  useNuiMessage(NuiMessage.closeCharacters, onClose);
  useNuiMessage(NuiMessage.leaveCharacters, onLeave);
  useNuiMessage(NuiMessage.portrait, onPortrait);

  // The page can mount after the client already sent the screen: ask once.
  useEffect(() => {
    void fetchNui(NuiCallback.ready).then(onOpen, () => undefined);
  }, [onOpen]);

  return <CharacterScreen />;
}
