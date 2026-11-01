import type { CardSpec, DataSpec, WidgetSpec } from "@aicore-fivem/shared";

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

/** Fields of a layer's card after its script select. */
const MORE_FIELDS: Partial<Record<keyof ServiceChoices, WidgetSpec[]>> = {
  banking: [
    {
      widget: "select",
      path: "bankAccounts",
      label: "ADMIN_F_BANK_ACCOUNTS",
      hint: "ADMIN_H_BANK_ACCOUNTS",
      options: [
        { value: "core", label: "ADMIN_O_BANK_ACCOUNTS_CORE" },
        { value: "own", label: "ADMIN_O_BANK_ACCOUNTS_OWN" },
      ],
    },
  ],
};

/** Settings sections: `auto` or one adapter's resource name each, plus the banking account mode. */
export const servicesSections = (
  choices: ServiceChoices,
): Record<string, DataSpec> => ({
  ...Object.fromEntries(
    LAYERS.map(({ key }) => [
      key,
      { type: "enum", values: ["auto", ...(choices[key] ?? [])] },
    ]),
  ),
  bankAccounts: { type: "enum", values: ["core", "own"] },
});

export const SERVICES_DEFAULTS = {
  billing: "auto",
  banking: "auto",
  bankAccounts: "core",
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
      ...(MORE_FIELDS[key] ?? []),
    ],
  }));
