import type { CardSpec } from "@aicore-fivem/shared";
import { PRIME_TIME_SYSTEM_NAMES } from "../jobs/primeTime/names";

/** Prime time cards: the rules (Job rules tab, settings `primeTime`) and a job's own hours (Jobs tab). */

const hourField = (path: string, label: string) =>
  ({
    widget: "number",
    path,
    label,
    min: 0,
    max: 23,
    unit: "ADMIN_U_HOUR",
  }) as const;

export const primeTimeCard: CardSpec = {
  icon: "clock",
  title: "ADMIN_C_PRIME_TIME",
  desc: "ADMIN_C_PRIME_TIME_DESC",
  fields: [
    {
      widget: "switch",
      path: "primeTime.enabled",
      label: "ADMIN_F_PRIME_ENABLED",
      hint: "ADMIN_H_PRIME_ENABLED",
    },
    {
      widget: "number",
      path: "primeTime.offPrimeMultiplier",
      label: "ADMIN_F_OFF_PRIME_MULTIPLIER",
      hint: "ADMIN_H_OFF_PRIME_MULTIPLIER",
      min: 0,
      max: 1,
      step: 0.05,
      unit: "ADMIN_U_TIMES",
    },
    {
      widget: "select",
      path: "primeTime.source",
      label: "ADMIN_F_PRIME_SOURCE",
      hint: "ADMIN_H_PRIME_SOURCE",
      options: [
        { value: "auto", label: "ADMIN_O_INVENTORY_AUTO" },
        { value: "ai-core", label: "ADMIN_O_PRIME_CORE" },
        ...PRIME_TIME_SYSTEM_NAMES.map((resource) => ({
          value: resource,
          label: resource,
        })),
      ],
    },
    {
      widget: "info",
      path: "primeTimeActive",
      label: "ADMIN_F_PRIME_ACTIVE",
      hint: "ADMIN_H_PRIME_ACTIVE",
      // A script's name shows as it is.
      values: {
        "ai-core": "ADMIN_O_PRIME_ACTIVE_CORE",
        none: "ADMIN_O_PRIME_ACTIVE_NONE",
      },
    },
    hourField("primeTime.start", "ADMIN_F_PRIME_START"),
    hourField("primeTime.finish", "ADMIN_F_PRIME_FINISH"),
  ],
};

const ownHours = { path: "primeOwn", values: [true] };

export const jobPrimeCard: CardSpec = {
  icon: "clock",
  title: "ADMIN_C_PRIME_TIME",
  desc: "ADMIN_C_JOB_PRIME_DESC",
  fields: [
    {
      widget: "switch",
      path: "primeOwn",
      label: "ADMIN_F_PRIME_OWN",
      hint: "ADMIN_H_PRIME_OWN",
    },
    { ...hourField("primeStart", "ADMIN_F_PRIME_START"), showIf: ownHours },
    { ...hourField("primeFinish", "ADMIN_F_PRIME_FINISH"), showIf: ownHours },
  ],
};
