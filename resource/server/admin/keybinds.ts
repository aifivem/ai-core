import { isRecord } from "@aicore-fivem/lib/shared"
import type { KeybindInfo } from "@aicore-fivem/shared"
import { panel } from "../content"

/**
 * The panel's Keybinds tab: `data/keybinds.json` (`sync: "all"`, key = keybind name) holds each keybind's description
 * as its script reports it plus the owner's `key`. Keybinds live on clients, so an admin's client reports the ones it
 * knows when the panel opens; new or changed ones are stored with `commit` (the owner's key is kept).
 */
const FILE = "keybinds"
const MAX = 500
const NAME = /^[\w.-]{1,64}$/

const KEYBOARD = new Set([
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  ...Array.from({ length: 24 }, (_, i) => `F${i + 1}`),
  ...Array.from({ length: 10 }, (_, i) => `NUMPAD${i}`),
  "ESCAPE",
  "BACK",
  "TAB",
  "RETURN",
  "SPACE",
  "CAPITAL",
  "LSHIFT",
  "RSHIFT",
  "LCONTROL",
  "RCONTROL",
  "LMENU",
  "RMENU",
  "LWIN",
  "RWIN",
  "APPS",
  "INSERT",
  "DELETE",
  "HOME",
  "END",
  "PAGEUP",
  "PAGEDOWN",
  "UP",
  "DOWN",
  "LEFT",
  "RIGHT",
  "PAUSE",
  "SCROLL",
  "NUMLOCK",
  "MULTIPLY",
  "ADD",
  "SUBTRACT",
  "DECIMAL",
  "DIVIDE",
  "NUMPADENTER",
  "NUMPADEQUALS",
  "GRAVE",
  "MINUS",
  "EQUALS",
  "PLUS",
  "LBRACKET",
  "RBRACKET",
  "BACKSLASH",
  "SEMICOLON",
  "APOSTROPHE",
  "COMMA",
  "PERIOD",
  "SLASH",
  "OEM_102",
])
const MOUSE = new Set([
  "MOUSE_LEFT",
  "MOUSE_RIGHT",
  "MOUSE_MIDDLE",
  "MOUSE_EXTRABTN1",
  "MOUSE_EXTRABTN2",
  "MOUSE_EXTRABTN3",
  "MOUSE_EXTRABTN4",
  "MOUSE_EXTRABTN5",
  "IOM_WHEEL_UP",
  "IOM_WHEEL_DOWN",
])

const text = (value: unknown, max: number): string | null =>
  typeof value === "string" && value.length <= max ? value : null

function readKeybind(value: unknown): KeybindInfo | null {
  if (!isRecord(value)) return null
  const resource = text(value.resource, 64)
  const name = text(value.name, 64)
  const description = text(value.description, 120)
  const defaultKey = text(value.defaultKey, 32)
  const mapper = text(value.mapper, 32)
  if (
    !resource ||
    !name ||
    !NAME.test(name) ||
    description === null ||
    defaultKey === null ||
    !mapper
  )
    return null
  return {
    resource,
    name,
    description,
    defaultKey: defaultKey.toUpperCase(),
    mapper,
  }
}

/** The keybinds an admin's client sent with the panel open (`null` refuses the call). */
export function readKeybinds(value: unknown): KeybindInfo[] | null {
  if (!Array.isArray(value) || value.length > MAX) return null
  return value.map(readKeybind).filter((k): k is KeybindInfo => k !== null)
}

/** Stores keybinds that are new or whose description, default or mapper changed. */
export function reportKeybinds(list: KeybindInfo[]): void {
  const stored = panel.get<Record<string, unknown>>(FILE)
  for (const info of list) {
    const raw = stored[info.name]
    const old = isRecord(raw) ? raw : null
    if (
      old &&
      old.resource === info.resource &&
      old.description === info.description &&
      old.defaultKey === info.defaultKey &&
      old.mapper === info.mapper
    )
      continue
    const key = typeof old?.key === "string" ? old.key : ""
    panel.commit(FILE, info.name, {
      resource: info.resource,
      description: info.description,
      defaultKey: info.defaultKey,
      mapper: info.mapper,
      key,
    })
  }
}

// An empty key = the script's default; otherwise a key name the record's input device knows.
panel.rule(FILE, (_key, next) => {
  const key = typeof next.key === "string" ? next.key.toUpperCase() : ""
  if (key === "") return null
  if (next.mapper === "keyboard")
    return KEYBOARD.has(key) ? null : "ADMIN_ERR_KEY"
  if (next.mapper === "MOUSE_BUTTON")
    return MOUSE.has(key) ? null : "ADMIN_ERR_KEY"
  return null
})
