import { spec } from "@aicore-fivem/lib/shared";
import type { DataSpec, WidgetSpec } from "@aicore-fivem/shared";

/** Data specs and rows shared by several sections of ai-core's panel. */

export const ID = "^[a-z0-9_]{2,32}$";
export const text = (max: number, min = 1): DataSpec => ({
  type: "text",
  min,
  max,
});
export const bool: DataSpec = { type: "bool" };
export const grades: DataSpec = {
  type: "list",
  min: 1,
  max: 30,
  of: {
    type: "object",
    fields: {
      label: text(48),
      salary: spec.int(0, 1_000_000),
      offPrimePayment: { ...spec.int(0, 1_000_000), optional: true },
      boss: { type: "bool", optional: true },
    },
  },
};
export const hour = spec.int(0, 23);
export const optionalHour: DataSpec = { ...hour, optional: true };

export const gradeRows = (salary: boolean): WidgetSpec[] => [
  {
    widget: "text",
    path: "label",
    label: "ADMIN_F_GRADE_NAME",
    placeholder: "ADMIN_PH_GRADE",
  },
  ...(salary
    ? [
        {
          widget: "number",
          path: "salary",
          label: "ADMIN_F_SALARY",
          min: 0,
          step: 5,
          unit: "$",
        } satisfies WidgetSpec,
        {
          widget: "number",
          path: "offPrimePayment",
          label: "ADMIN_F_OFF_PRIME_PAYMENT",
          min: 0,
          step: 5,
          unit: "$",
        } satisfies WidgetSpec,
      ]
    : []),
  { widget: "switch", path: "boss", label: "ADMIN_F_BOSS" },
];
