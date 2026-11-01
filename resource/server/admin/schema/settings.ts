import { spec } from "@aicore-fivem/lib/shared";
import type { FileSpec } from "@aicore-fivem/shared";
import { DEFAULT_SCENE } from "../../content/scene";
import { DEFAULT_PRIME_TIME, PRIME_SOURCES } from "../../content/primeTime";
import { NOTIFY_SYSTEMS } from "../../notify/registry";
import {
  DEFAULT_RECOMMENDATIONS,
  RECOMMENDATIONS_SECTION,
} from "../../recommendations/schema";
import {
  CHARACTER_SCREEN_DEFAULTS,
  CHARACTER_SCREEN_SECTIONS,
} from "../../multichar/schema";
import type { LayerChoices } from "./layers";
import { sceneSection } from "./sceneSection";
import { servicesSections, SERVICES_DEFAULTS } from "./services";
import { bool, hour, ID, text } from "./specs";

/** ai-core's settings file (`data/settings.json`): every settings tab edits it. */
export function settingsFile({
  inventories,
  keySystems,
  alertSystems,
  clothingSystems,
  fuelSystems,
  doorSystems,
  garageSystems,
  services,
}: LayerChoices): FileSpec {
  return {
    kind: "settings",
    sync: "admin",
    sections: {
      branding: {
        type: "object",
        fields: {
          name: text(32),
          subtitle: text(32),
          tagline: text(48, 0),
          taglineSub: text(64, 0),
          background: { type: "enum", values: ["skyline", "wet-drive"] },
        },
      },
      characters: {
        type: "object",
        fields: {
          slots: spec.int(1, 10),
          canDelete: bool,
          minAge: spec.int(0, 99),
        },
      },
      jobs: {
        type: "object",
        fields: {
          multiJob: bool,
          maxJobs: spec.int(1, 20),
          unemployed: { type: "text", max: 32, pattern: ID },
          restoreDuty: bool,
        },
      },
      gangs: {
        type: "object",
        fields: { multiGang: bool, maxGangs: spec.int(1, 20) },
      },
      paycheck: {
        type: "object",
        fields: {
          intervalMinutes: spec.int(0, 1440),
          account: { type: "text", max: 32, pattern: ID },
          fromJobAccount: bool,
        },
      },
      primeTime: {
        type: "object",
        fields: {
          enabled: bool,
          source: { type: "enum", values: [...PRIME_SOURCES] },
          offPrimeMultiplier: { type: "number", min: 0, max: 1 },
          start: hour,
          finish: hour,
        },
      },
      // Written by ai-core (jobs/primeTime), shown read only.
      primeTimeActive: {
        type: "enum",
        values: ["none", ...PRIME_SOURCES.filter((s) => s !== "auto")],
        optional: true,
      },
      saveIntervalMinutes: spec.int(1, 60),
      inventory: { type: "enum", values: ["auto", ...inventories] },
      vehicleKeys: { type: "enum", values: ["auto", ...keySystems] },
      dispatch: { type: "enum", values: ["auto", ...alertSystems] },
      appearance: { type: "enum", values: ["auto", ...clothingSystems] },
      ...servicesSections(services),
      fuel: { type: "enum", values: ["auto", ...fuelSystems] },
      doorlock: { type: "enum", values: ["auto", ...doorSystems] },
      garages: { type: "enum", values: ["auto", ...garageSystems] },
      notify: {
        type: "enum",
        values: NOTIFY_SYSTEMS.map((s) => s.resource),
      },
      interaction: { type: "enum", values: ["prompt", "target"] },
      pvp: { type: "bool" },
      refuseOnConflict: { type: "bool" },
      setupDone: { type: "bool" },
      updates: {
        type: "object",
        fields: {
          check: { type: "bool" },
          ignore: {
            type: "names",
            lookup: "resource",
            max: 64,
            itemMax: 64,
          },
        },
      },
      recommendations: RECOMMENDATIONS_SECTION,
      spawn: {
        type: "object",
        fields: {
          default: { type: "vec4" },
          choose: { type: "bool", optional: true },
          points: {
            type: "list",
            max: 20,
            optional: true,
            of: {
              type: "object",
              fields: {
                label: { type: "text", min: 1, max: 48 },
                coords: { type: "vec4" },
              },
            },
          },
        },
      },
      characterScene: sceneSection,
      ...CHARACTER_SCREEN_SECTIONS,
    },
    defaults: {
      characterScene: DEFAULT_SCENE,
      ...CHARACTER_SCREEN_DEFAULTS,
      primeTime: DEFAULT_PRIME_TIME,
      inventory: "auto",
      vehicleKeys: "auto",
      dispatch: "auto",
      appearance: "auto",
      ...SERVICES_DEFAULTS,
      fuel: "auto",
      doorlock: "auto",
      garages: "auto",
      notify: "ai-lib",
      interaction: "prompt",
      pvp: true,
      refuseOnConflict: true,
      setupDone: false,
      updates: { check: true, ignore: [] },
      recommendations: DEFAULT_RECOMMENDATIONS,
    },
  };
}
