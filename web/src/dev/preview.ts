import { update } from "../features/characters/store";
import { inGame } from "../lib/nui";

/**
 * Browser preview only: a game-like backdrop (the page is transparent in game) and `?view=create|delete|error`
 * to open a state directly for screenshots.
 */
export function applyPreview(): void {
  if (inGame) return;
  document.body.style.background = "linear-gradient(135deg, #2b3440 0%, #11161c 100%)";
  const view = new URLSearchParams(window.location.search).get("view");
  if (!view) return;
  setTimeout(() => {
    if (view === "create") update({ view: { kind: "create", slot: 2 } });
    if (view === "delete") update({ view: { kind: "delete", characterId: 1 } });
    if (view === "error") update({ view: { kind: "create", slot: 2 }, error: "CHAR_ERR_FIRSTNAME" });
  }, 600);
}
