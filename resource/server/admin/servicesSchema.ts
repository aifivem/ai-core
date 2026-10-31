import type { CardSpec, DataSpec } from "@aicore-fivem/shared";

/** The adapter names of the billing, banking, MDT and EMS layers (panel selects next to dispatch and clothing). */
export interface ServiceChoices {
  billing?: string[];
  banking?: string[];
  mdt?: string[];
  ems?: string[];
}

const LAYERS = [
  { key: "billing", icon: "file-invoice-dollar", name: "BILLING" },
  { key: "banking", icon: "building-columns", name: "BANKING" },
  { key: "mdt", icon: "tablet-screen-button", name: "MDT" },
  { key: "ems", icon: "kit-medical", name: "EMS" },
] as const;

/** Settings sections: `auto` or one adapter's resource name each. */
export const servicesSections = (
  choices: ServiceChoices,
): Record<string, DataSpec> =>
  Object.fromEntries(
    LAYERS.map(({ key }) => [
      key,
      { type: "enum", values: ["auto", ...(choices[key] ?? [])] },
    ]),
  );

export const SERVICES_DEFAULTS = {
  billing: "auto",
  banking: "auto",
  mdt: "auto",
  ems: "auto",
};

/** One card with a select per layer (texts `ADMIN_C_<NAME>`, `_DESC`, `ADMIN_F_<NAME>`, `ADMIN_H_<NAME>`). */
export const servicesCards = (choices: ServiceChoices): CardSpec[] =>
  LAYERS.map(({ key, icon, name }) => ({
    icon,
    title: `ADMIN_C_${name}`,
    desc: `ADMIN_C_${name}_DESC`,
    fields: [
      {
        widget: "select",
        path: key,
        label: `ADMIN_F_${name}`,
        hint: `ADMIN_H_${name}`,
        options: [
          { value: "auto", label: "ADMIN_O_INVENTORY_AUTO" },
          ...(choices[key] ?? []).map((value) => ({ value, label: value })),
        ],
      },
    ],
  }));
