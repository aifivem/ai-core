import type { CharacterScreen } from "@aicore-fivem/shared"
import { setTexts } from "../../lib/lang"
import { selectCard } from "./actions"
import { update } from "./store"

export interface OpenPayload {
  screen: CharacterScreen
  texts: Record<string, string>
  portraits: Record<number, string>
  scene: boolean
}

/** Portrait urls from the client: only `nui-img` urls by numeric id pass. */
export function toPortraits(value: unknown): Record<number, string> {
  const out: Record<number, string> = {}
  if (typeof value !== "object" || value === null) return out
  for (const [id, url] of Object.entries(value)) {
    if (
      /^\d+$/.test(id) &&
      typeof url === "string" &&
      url.startsWith("https://nui-img/")
    )
      out[Number(id)] = url
  }
  return out
}

/** The client's payload is ai-core's own object; only the shape the screen needs is checked. */
export function toOpenPayload(value: unknown): OpenPayload | null {
  if (typeof value !== "object" || value === null) return null
  const payload = value as {
    screen?: unknown
    texts?: unknown
    portraits?: unknown
    scene?: unknown
  }
  const screen = payload.screen as CharacterScreen | undefined
  if (
    !screen ||
    !Array.isArray(screen.characters) ||
    typeof screen.slots !== "number"
  )
    return null
  const texts =
    typeof payload.texts === "object" && payload.texts !== null
      ? (payload.texts as Record<string, string>)
      : {}
  return {
    screen,
    texts,
    portraits: toPortraits(payload.portraits),
    scene: payload.scene === true,
  }
}

/** Shows the screen with the first character selected (or the list of empty slots). */
export function openScreen(payload: OpenPayload): void {
  setTexts(payload.texts)
  const first = payload.screen.characters[0]?.id ?? null
  update({
    open: true,
    screen: payload.screen,
    selected: first,
    view: { kind: "list" },
    busy: false,
    error: null,
    portraits: payload.portraits,
    scene: payload.scene,
  })
  if (first !== null) selectCard(first)
}
