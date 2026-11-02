import { fromServer, onServerEvent } from "@aifivem/lib/client";

/**
 * A phone event its docs listen to with `RegisterNetEvent`: it may come from the phone's client (a local emit) or its
 * server. Each call reaches `handler` once: the local listener skips what the server sent.
 */
export function onPhoneEvent(
  name: string,
  handler: (...args: unknown[]) => void,
): void {
  on(name, (...args: unknown[]) => {
    if (!fromServer()) handler(...args);
  });
  onServerEvent(name, { args: (raw) => raw }, handler);
}
