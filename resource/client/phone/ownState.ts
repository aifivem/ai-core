import { cache, type PlayerState } from "@aifivem/lib/client";

/**
 * A phone's "open" value in the local player's state bag turning true: one opening. Read on this client only, so a
 * bag the phone writes from its own client counts too (the server refusing it under strict mode changes nothing here).
 */
export function onOwnOpen(
  state: PlayerState<boolean>,
  opened: () => void,
): void {
  state.onChange((id, open, old) => {
    if (id === cache.serverId && open === true && old !== true) opened();
  });
}
