/** One key cap: the key mapping name FiveM uses (RegisterKeyMapping), its cap text and width in key units. */
export interface KeyCap {
  id: string;
  label: string;
  w?: number;
}

const letters = (keys: string): KeyCap[] =>
  keys.split("").map((k) => ({ id: k, label: k }));

/** A US keyboard's main block, top to bottom; a spacer has an empty id. */
export const ROWS: KeyCap[][] = [
  [
    { id: "ESCAPE", label: "Esc" },
    { id: "", label: "", w: 0.6 },
    ...Array.from({ length: 4 }, (_, i) => ({ id: `F${i + 1}`, label: `F${i + 1}` })),
    { id: "", label: "", w: 0.4 },
    ...Array.from({ length: 4 }, (_, i) => ({ id: `F${i + 5}`, label: `F${i + 5}` })),
    { id: "", label: "", w: 0.4 },
    ...Array.from({ length: 4 }, (_, i) => ({ id: `F${i + 9}`, label: `F${i + 9}` })),
  ],
  [
    { id: "GRAVE", label: "`" },
    ...letters("1234567890"),
    { id: "MINUS", label: "-" },
    { id: "EQUALS", label: "=" },
    { id: "BACK", label: "Back", w: 2 },
  ],
  [
    { id: "TAB", label: "Tab", w: 1.5 },
    ...letters("QWERTYUIOP"),
    { id: "LBRACKET", label: "[" },
    { id: "RBRACKET", label: "]" },
    { id: "BACKSLASH", label: "\\", w: 1.5 },
  ],
  [
    { id: "CAPITAL", label: "Caps", w: 1.8 },
    ...letters("ASDFGHJKL"),
    { id: "SEMICOLON", label: ";" },
    { id: "APOSTROPHE", label: "'" },
    { id: "RETURN", label: "Enter", w: 2.2 },
  ],
  [
    { id: "LSHIFT", label: "Shift", w: 2.3 },
    ...letters("ZXCVBNM"),
    { id: "COMMA", label: "," },
    { id: "PERIOD", label: "." },
    { id: "SLASH", label: "/" },
    { id: "RSHIFT", label: "Shift", w: 2.7 },
  ],
  [
    { id: "LCONTROL", label: "Ctrl", w: 1.5 },
    { id: "", label: "", w: 1.25 },
    { id: "LMENU", label: "Alt", w: 1.25 },
    { id: "SPACE", label: "Space", w: 6.5 },
    { id: "RMENU", label: "Alt", w: 1.25 },
    { id: "", label: "", w: 1.25 },
    { id: "RCONTROL", label: "Ctrl", w: 2 },
  ],
];

/** Arrow keys and the block above them, right of the main block. */
export const SIDE: KeyCap[][] = [
  [
    { id: "INSERT", label: "Ins" },
    { id: "HOME", label: "Home" },
    { id: "PAGEUP", label: "PgUp" },
  ],
  [
    { id: "DELETE", label: "Del" },
    { id: "END", label: "End" },
    { id: "PAGEDOWN", label: "PgDn" },
  ],
  [],
  [
    { id: "", label: "" },
    { id: "UP", label: "↑" },
    { id: "", label: "" },
  ],
  [
    { id: "LEFT", label: "←" },
    { id: "DOWN", label: "↓" },
    { id: "RIGHT", label: "→" },
  ],
];

/** Keys as the game names them in instructional buttons, mapped to the mapping names above. */
const ALIASES: Record<string, string> = {
  ";": "SEMICOLON",
  "'": "APOSTROPHE",
  ",": "COMMA",
  ".": "PERIOD",
  "/": "SLASH",
  "\\": "BACKSLASH",
  "[": "LBRACKET",
  "]": "RBRACKET",
  "-": "MINUS",
  "=": "EQUALS",
  "`": "GRAVE",
  ESC: "ESCAPE",
  ENTER: "RETURN",
  BACKSPACE: "BACK",
  CAPSLOCK: "CAPITAL",
  CTRL: "LCONTROL",
  LCTRL: "LCONTROL",
  RCTRL: "RCONTROL",
  SHIFT: "LSHIFT",
  ALT: "LMENU",
  LALT: "LMENU",
  RALT: "RMENU",
  DEL: "DELETE",
  INS: "INSERT",
  PGUP: "PAGEUP",
  PGDN: "PAGEDOWN",
};

/** A bound key in the layout's naming. */
export const keyId = (key: string): string => {
  const k = key.toUpperCase();
  return ALIASES[k] ?? k;
};
