import { registerExport } from "@aicore-fivem/lib/client";
import { isRecord } from "@aicore-fivem/lib/shared";
import type { MinigameRequest, SkillStage } from "@aicore-fivem/shared";
import { Locale, ResourceName } from "common";
import { dialogs } from "./menu";

const clamp = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v)
    ? Math.min(max, Math.max(min, v))
    : fallback;

function toRequest(v: unknown): MinigameRequest | null {
  if (!isRecord(v)) return null;
  if (v.kind === "skillCheck" && Array.isArray(v.stages)) {
    const stages: SkillStage[] = v.stages
      .slice(0, 20)
      .flatMap((s) =>
        isRecord(s)
          ? [
              {
                area: clamp(s.area, 5, 180, 50),
                speed: clamp(s.speed, 0.1, 3, 0.6),
              },
            ]
          : [],
      );
    const keys = Array.isArray(v.keys)
      ? v.keys.filter(
          (k): k is string => typeof k === "string" && /^[a-z0-9]$/.test(k),
        )
      : [];
    return stages.length
      ? { kind: "skillCheck", stages, keys: keys.length ? keys : ["e"] }
      : null;
  }
  if (v.kind === "lockpick")
    return {
      kind: "lockpick",
      pins: Math.floor(clamp(v.pins, 1, 6, 1)),
      area: clamp(v.area, 3, 60, 11),
      picks: Math.floor(clamp(v.picks, 1, 10, 1)),
    };
  return null;
}

/** Skill checks and lockpicks of every resource (lib `skillCheck` / `lockpick`), drawn as an ai-core dialog. */
registerExport("OpenMinigame", (id: unknown, request: unknown) => {
  const game = toRequest(request);
  if (typeof id !== "number" || !game) return;
  dialogs.open("minigame", GetInvokingResource() || ResourceName, id, {
    ...game,
    texts: {
      move: Locale("MINIGAME_MOVE"),
      turn: Locale("MINIGAME_TURN"),
      press: Locale("MINIGAME_PRESS"),
      cancel: Locale("MINIGAME_CANCEL"),
      picks: Locale("MINIGAME_PICKS"),
    },
  });
});
