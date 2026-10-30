import type { CharacterScreen } from "@aicore-fivem/shared";
import en from "../../../locales/en.json";

/** Browser preview only (`bun run dev` in web/): a fake client answering the NUI callbacks. */
export const MOCK_SCREEN: CharacterScreen = {
  branding: {
    name: "Los Santos",
    subtitle: "Roleplay",
    tagline: "A city of opportunity",
    taglineSub: "People • Stories • A second chance",
    background: "skyline",
  },
  slots: 4,
  canDelete: true,
  scene: {
    fov: 50,
    time: { enabled: false, hour: 12, minute: 0, weather: "EXTRASUNNY" },
    spots: [
      {
        ped: { x: 0, y: 0, z: 0, heading: 0 },
        anim: "",
        clip: "",
        camDistance: 1.5,
        camHeight: 0,
        camAngle: 0,
        targetHeight: 0.4,
        sway: 0,
        blur: false,
        blurNear: 0,
        blurFar: 2,
        blurStrength: 100,
      },
    ],
  },
  characters: [
    {
      id: 1,
      citizenid: "AB12CD34",
      slot: 1,
      firstname: "Jamie",
      lastname: "Carter",
      birthdate: "1994-05-12",
      sex: "male",
      online: false,
      job: "Police",
      cash: 1250,
      bank: 48200,
      lastPlayed: Date.now() - 86_400_000,
    },
    {
      id: 2,
      citizenid: "QX7M2K9P",
      slot: 2,
      firstname: "Elena",
      lastname: "Cruz",
      birthdate: "1997-11-02",
      sex: "female",
      online: false,
      job: "Mechanic",
      cash: 12450,
      bank: 238600,
      lastPlayed: Date.now() - 3_600_000,
    },
    {
      id: 3,
      citizenid: "ZB4T8N1R",
      slot: 3,
      firstname: "Darnell",
      lastname: "Brooks",
      birthdate: "1990-03-21",
      sex: "male",
      online: true,
      job: null,
      cash: 300,
      bank: 1200,
      lastPlayed: null,
    },
  ],
};

export async function mockFetch(name: string, data?: unknown): Promise<unknown> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  // Views of the in-game UIs (admin, prompts, menu, notifications) preview without the character screen.
  const params = new URLSearchParams(window.location.search);
  if (name === "ready") return ["admin", "prompt", "menu", "notify"].includes(params.get("view") ?? "") ? null : { screen: MOCK_SCREEN, texts: en, scene: params.has("scene") };
  if (name === "remove") return { ok: true, screen: { ...MOCK_SCREEN, characters: [] } };
  if (name === "create" && typeof data === "object" && data !== null && (data as { firstname?: string }).firstname === "Taken") {
    return { ok: false, error: "CHAR_ERR_SLOT_TAKEN" };
  }
  return { ok: true };
}
