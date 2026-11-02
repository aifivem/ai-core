import type { CardSpec } from "@aifivem/shared";

const shown = { path: "warnings.hurt", values: [true] };

/** Health loss card of the Hunger and thirst tab: its own level, amount and interval. */
export const HURT_CARD: CardSpec = {
  icon: "heart-pulse",
  title: "ADMIN_C_NEEDS_HURT",
  desc: "ADMIN_C_NEEDS_HURT_DESC",
  fields: [
    {
      widget: "switch",
      path: "warnings.hurt",
      label: "ADMIN_F_WARN_HURT",
      hint: "ADMIN_H_WARN_HURT",
    },
    {
      widget: "number",
      path: "warnings.hurtAt",
      label: "ADMIN_F_WARN_HURT_AT",
      hint: "ADMIN_H_WARN_HURT_AT",
      min: 0,
      max: 100,
      showIf: shown,
    },
    {
      widget: "number",
      path: "warnings.damage",
      label: "ADMIN_F_WARN_DAMAGE",
      hint: "ADMIN_H_WARN_DAMAGE",
      min: 1,
      max: 50,
      unit: "ADMIN_U_HP",
      showIf: shown,
    },
    {
      widget: "number",
      path: "warnings.hurtEvery",
      label: "ADMIN_F_WARN_HURT_EVERY",
      hint: "ADMIN_H_WARN_HURT_EVERY",
      min: 5,
      max: 3600,
      step: 5,
      unit: "ADMIN_U_SEC",
      showIf: shown,
    },
  ],
};
