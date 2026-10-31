import type {
  AdminOpenData,
  AdminPanelSnapshot,
  AdminPatch,
  AdminResult,
  LookupOption,
} from "@aicore-fivem/shared";
import { coreSchema } from "../../../resource/server/admin/schema";
import { VRP_NEW_RULE } from "../../../resource/server/vrp/schema";
import accountsFile from "../../../data/accounts.json";
import gangsFile from "../../../data/gangs.json";
import jobsFile from "../../../data/jobs.json";
import settingsFile from "../../../data/settings.json";
import en from "../../../locales/en.json";

/** The data files as the panel gets them: without their editor-only `$schema` key. */
function data<T extends { $schema?: string }>(file: T): Omit<T, "$schema"> {
  const { $schema: _schema, ...rest } = file;
  return rest;
}
const accounts = data(accountsFile);
const gangs = data(gangsFile);
const jobs = data(jobsFile);
const settings = data(settingsFile);

/**
 * Browser preview only: `?view=admin#/admin/ai-core/<tab>?key=<record>` opens the panel with ai-core's real schema and
 * data files; `&error=1` refuses every edit. fivem-nui-react hands these out only outside the game.
 */
const params = new URLSearchParams(window.location.search);
export const adminPreview = params.get("view") === "admin";

// Keybinds and commands come from the running scripts in game; the preview shows a typical set.
const kb = (
  resource: string,
  description: string,
  defaultKey: string,
  key = "",
  mapper = "keyboard",
) => ({ resource, description, defaultKey, mapper, key });
const keybinds = {
  aicore_admin: kb("ai-core", "Open the admin panel", "F10"),
  aicore_interact: kb("ai-core", "Interact with the prompt on screen", "E"),
  chat_open: kb("ai-chat", "Open the chat", "T"),
  inventory_open: kb("ai-inventory", "Open the inventory", "TAB"),
  inventory_reload: kb("ai-inventory", "Reload the weapon", "R"),
  police_menu: kb("ai-police", "Open the police menu", "F6", "F7"),
  radialmenu_open: kb("ai-radialmenu", "Open the radial menu", "F3"),
  scoreboard_open: kb("ai-scoreboard", "Show the scoreboard (hold)", "HOME"),
  smallresources_belt: kb(
    "ai-smallresources",
    "Fasten or open the seatbelt",
    "B",
  ),
  smallresources_crouch: kb("ai-smallresources", "Crouch", "X", "LCONTROL"),
  vehiclekeys_lock: kb("ai-vehiclekeys", "Lock or unlock the vehicle", "L"),
};
const cmd = (
  name: string,
  resource: string,
  help: string,
  usage: string,
  access: string,
  kind: "lib" | "plain",
  aliases = "",
) => [name, { name, aliases, resource, help, usage, access, kind }] as const;
const commands = Object.fromEntries([
  cmd(
    "aiadmin",
    "ai-core",
    "Open the admin panel",
    "/aiadmin",
    "ai.admin",
    "lib",
  ),
  cmd(
    "aicore_db",
    "ai-core",
    "Database statistics of every resource in the server console",
    "/aicore_db [slow]",
    "ai.admin",
    "lib",
  ),
  cmd(
    "aicore_duty",
    "ai-core",
    "Go on duty in a job (off = off duty)",
    "/aicore_duty <job> [id]",
    "ai.admin",
    "lib",
  ),
  cmd(
    "aicore_gang",
    "ai-core",
    "Give a gang at a grade",
    "/aicore_gang <gang> <grade> [id]",
    "ai.admin",
    "lib",
  ),
  cmd(
    "aicore_job",
    "ai-core",
    "Give a job at a grade",
    "/aicore_job <job> <grade> [id]",
    "ai.admin",
    "lib",
  ),
  cmd(
    "aicore_money",
    "ai-core",
    "Add to an account (a negative amount takes)",
    "/aicore_money <account> <amount> [id]",
    "ai.admin",
    "lib",
  ),
  cmd(
    "aicore_switch",
    "ai-core",
    "Back to the character screen",
    "/aicore_switch [id]",
    "ai.admin",
    "lib",
  ),
  cmd(
    "tp",
    "ai-admin",
    "Teleport to a player",
    "/tp <id>",
    "group.admin",
    "lib",
    "goto",
  ),
  cmd(
    "noclip",
    "ai-admin",
    "Fly through the world",
    "/noclip",
    "ai.admin",
    "lib",
  ),
  cmd(
    "me",
    "ai-chat",
    "Describe what your character does",
    "/me <text>",
    "",
    "lib",
  ),
  cmd("e", "dpemotes", "", "/e", "?", "plain"),
  cmd("emotemenu", "dpemotes", "", "/emotemenu", "?", "plain"),
  cmd("txadmin", "monitor", "", "/txadmin", "?", "plain"),
  cmd("tx", "monitor", "", "/tx", "?", "plain"),
]);

const options = (
  records: Record<string, { label?: string; grades?: { label: string }[] }>,
): LookupOption[] =>
  Object.entries(records).map(([value, r]) => ({
    value,
    label: r.label ?? value,
    grades: r.grades?.map((g) => g.label),
  }));
// The vRP tab with a few rules and the permission names scripts asked for.
const vrp = {
  defaults: {
    jobPrefix: true,
    jobOnDuty: true,
    adminPrefix: true,
    playerPrefix: true,
  },
  permissions: [
    {
      ...VRP_NEW_RULE,
      permission: "police.service",
      who: "job",
      job: "police",
    },
    { ...VRP_NEW_RULE, permission: "mechanic.*", who: "job", job: "mechanic" },
    { ...VRP_NEW_RULE, permission: "vip.garage", who: "group", group: "vip" },
  ],
  groups: [
    {
      group: "Coronel",
      who: "job",
      job: "police",
      gang: "",
      grade: 3,
      admin: false,
    },
  ],
  items: [{ vrp: "edible|tacos", item: "bread" }],
  seen: Array.from({ length: 120 }, (_, i) =>
    i < 4
      ? ["police.service", "police.pc", "admin.tickets", "player.phone"][i]!
      : `script${i}.perm${i % 7}`,
  ),
};
const ITEMS: LookupOption[] = [
  { value: "bread", label: "Bread" },
  { value: "water", label: "Water" },
  { value: "lockpick", label: "Lockpick" },
  { value: "repairkit", label: "Repair kit" },
  { value: "rolex", label: "Rolex" },
  { value: "weed_bud", label: "Weed bud" },
];

export function mockAdminOpen():
  (AdminOpenData & { texts: Record<string, string> }) | undefined {
  if (!adminPreview) return undefined;
  const panel: AdminPanelSnapshot = {
    resource: "ai-core",
    schema: coreSchema(Object.keys(accounts)),
    texts: en,
    data: { settings, jobs, gangs, accounts, keybinds, commands, vrp },
  };
  return {
    panels: [panel],
    texts: en,
    lookups: {
      item: ITEMS,
      job: options(jobs),
      gang: options(gangs),
      account: options(accounts),
      resource: ["ai-core", "ai-rental", "ai-fuel", "ai-target"].map(
        (value) => ({ value, label: value }),
      ),
      player: [{ value: "AB123456", label: "John Doe (1)" }],
      vehicle: ["adder", "sultan", "police", "taxi"].map((value) => ({
        value,
        label: value,
      })),
      ped: [],
    },
    updates: [
      {
        resource: "ai-rental",
        label: "ai-rental",
        current: "0.1.0",
        latest: "0.2.0",
        url: "https://github.com/TGIANN/ai-rental/releases/tag/v0.2.0",
      },
      {
        resource: "ai-fuel",
        label: "ai-fuel",
        current: "0.1.0",
        latest: "0.1.3",
        url: "https://github.com/TGIANN/ai-fuel/releases/tag/v0.1.3",
      },
    ],
    recommendations: [
      {
        id: "tgiann-phone",
        title: "ADMIN_REC_TGIANN_PHONE",
        desc: "ADMIN_REC_TGIANN_PHONE_DESC",
        url: "https://www.tgiann.com/package/fivem-phone",
        free: false,
      },
      {
        id: "tgiann-esc-map",
        title: "ADMIN_REC_TGIANN_ESC_MAP",
        desc: "ADMIN_REC_TGIANN_ESC_MAP_DESC",
        url: "https://www.tgiann.com/package/fivem-custom-esc-map-blip-system",
        free: true,
      },
    ],
    external: [
      {
        id: "panel:craft",
        resource: "tgiann-blueprint-craft",
        label: "Blueprint crafting",
        icon: "puzzle-piece",
        description: "Recipes, benches and blueprints",
        command: "craftadmin",
      },
    ],
  };
}

export function mockAdminApply(patch: AdminPatch): AdminResult {
  if (params.get("error")) return { ok: false, error: "ADMIN_ERR_RANGE" };
  return patch.action === "create" && patch.key in jobs
    ? { ok: false, error: "ADMIN_ERR_EXISTS" }
    : { ok: true };
}
