import { useEffect } from "react"
import { mockFetch } from "../dev/mock"

/** Whether the page runs inside FiveM's CEF (false in a desktop browser preview). */
export const inGame =
  typeof (window as { invokeNative?: unknown }).invokeNative === "function"

const resourceName = (): string =>
  (
    window as { GetParentResourceName?: () => string }
  ).GetParentResourceName?.() ?? "ai-core"

/** Calls a client NUI callback (`RegisterNuiCallback`) and returns its JSON answer (unknown: parse it). */
export async function fetchNui(name: string, data?: unknown): Promise<unknown> {
  if (!inGame) return mockFetch(name, data)
  const response = await fetch(`https://${resourceName()}/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify(data ?? {}),
  })
  return response.json()
}

/** Runs `handler` for every `{ action, data }` message the client sends with SendNUIMessage. */
export function useNuiMessage(
  action: string,
  handler: (data: unknown) => void
): void {
  useEffect(() => {
    const listener = (event: MessageEvent<unknown>): void => {
      const message = event.data
      if (
        typeof message === "object" &&
        message !== null &&
        (message as { action?: unknown }).action === action
      ) {
        handler((message as { data?: unknown }).data)
      }
    }
    window.addEventListener("message", listener)
    return () => window.removeEventListener("message", listener)
  }, [action, handler])
}
