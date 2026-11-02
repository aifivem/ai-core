import { spec } from "@aifivem/lib/shared";
import type { DataSpec, FileSpec, TabSpec, WidgetSpec } from "@aifivem/shared";
import { NEEDS_DEFAULTS } from "../../common/needs";

/**
 * `data/needs.json` (ai-core's panel, `sync: "all"`: the client's warnings read it): hunger and thirst decay, start
 * values and the low-needs warnings. No FiveM code here: the web preview imports the panel schema.
 */

const bool: DataSpec = { type: "bool" };
const rate: DataSpec = { type: "number", min: 0, max: 10 };
const level = spec.int(0, 100);
const seconds = (min: number): DataSpec => spec.int(min, 3600);

export const NEEDS_FILE: FileSpec = {
  kind: "settings",
  sync: "all",
  sections: {
    decay: {
      type: "object",
      fields: { enabled: bool, hunger: rate, thirst: rate },
    },
    start: { type: "object", fields: { hunger: level, thirst: level } },
    warnings: {
      type: "object",
      fields: {
        notify: bool,
        lowAt: spec.int(1, 100),
        notifyEvery: seconds(10),
        faint: bool,
        criticalAt: spec.int(1, 100),
        faintEvery: seconds(10),
        fadeOut: { type: "number", min: 0.5, max: 10 },
        fadeIn: { type: "number", min: 0.5, max: 10 },
        hurt: bool,
        damage: { type: "number", min: 1, max: 50 },
        hurtEvery: seconds(5),
      },
    },
  },
  defaults: { ...NEEDS_DEFAULTS },
};

const per = (need: "hunger" | "thirst"): WidgetSpec => ({
  widget: "number",
  path: `decay.${need}`,
  label: need === "hunger" ? "ADMIN_F_HUNGER_RATE" : "ADMIN_F_THIRST_RATE",
  hint: "ADMIN_H_NEED_RATE",
  min: 0,
  max: 10,
  step: 0.05,
  unit: "ADMIN_U_PER_MIN",
  showIf: { path: "decay.enabled", values: [true] },
});

const startField = (need: "hunger" | "thirst"): WidgetSpec => ({
  widget: "number",
  path: `start.${need}`,
  label: need === "hunger" ? "ADMIN_F_START_HUNGER" : "ADMIN_F_START_THIRST",
  hint: "ADMIN_H_START_NEED",
  min: 0,
  max: 100,
});

/** The Hunger and thirst tab of ai-core's panel. */
export const NEEDS_TAB: TabSpec = {
  id: "needs",
  file: "needs",
  icon: "utensils",
  label: "ADMIN_TAB_NEEDS",
  desc: "ADMIN_TAB_NEEDS_DESC",
  cards: [
    {
      icon: "utensils",
      title: "ADMIN_C_NEEDS_DECAY",
      desc: "ADMIN_C_NEEDS_DECAY_DESC",
      fields: [
        {
          widget: "switch",
          path: "decay.enabled",
          label: "ADMIN_F_NEEDS_DECAY",
          hint: "ADMIN_H_NEEDS_DECAY",
        },
        per("hunger"),
        per("thirst"),
        startField("hunger"),
        startField("thirst"),
      ],
    },
    {
      icon: "triangle-exclamation",
      title: "ADMIN_C_NEEDS_WARNINGS",
      desc: "ADMIN_C_NEEDS_WARNINGS_DESC",
      fields: [
        {
          widget: "switch",
          path: "warnings.notify",
          label: "ADMIN_F_WARN_NOTIFY",
          hint: "ADMIN_H_WARN_NOTIFY",
        },
        {
          widget: "number",
          path: "warnings.lowAt",
          label: "ADMIN_F_WARN_LOW_AT",
          hint: "ADMIN_H_WARN_LOW_AT",
          min: 1,
          max: 100,
          showIf: { path: "warnings.notify", values: [true] },
        },
        {
          widget: "number",
          path: "warnings.notifyEvery",
          label: "ADMIN_F_WARN_NOTIFY_EVERY",
          hint: "ADMIN_H_WARN_NOTIFY_EVERY",
          min: 10,
          max: 3600,
          step: 5,
          unit: "ADMIN_U_SEC",
          showIf: { path: "warnings.notify", values: [true] },
        },
        {
          widget: "switch",
          path: "warnings.faint",
          label: "ADMIN_F_WARN_FAINT",
          hint: "ADMIN_H_WARN_FAINT",
        },
        {
          widget: "number",
          path: "warnings.criticalAt",
          label: "ADMIN_F_WARN_CRITICAL_AT",
          hint: "ADMIN_H_WARN_CRITICAL_AT",
          min: 1,
          max: 100,
        },
        {
          widget: "number",
          path: "warnings.faintEvery",
          label: "ADMIN_F_WARN_FAINT_EVERY",
          hint: "ADMIN_H_WARN_FAINT_EVERY",
          min: 10,
          max: 3600,
          step: 5,
          unit: "ADMIN_U_SEC",
          showIf: { path: "warnings.faint", values: [true] },
        },
        {
          widget: "number",
          path: "warnings.fadeOut",
          label: "ADMIN_F_WARN_FADE_OUT",
          hint: "ADMIN_H_WARN_FADE",
          min: 0.5,
          max: 10,
          step: 0.5,
          unit: "ADMIN_U_SEC",
          showIf: { path: "warnings.faint", values: [true] },
        },
        {
          widget: "number",
          path: "warnings.fadeIn",
          label: "ADMIN_F_WARN_FADE_IN",
          hint: "ADMIN_H_WARN_FADE",
          min: 0.5,
          max: 10,
          step: 0.5,
          unit: "ADMIN_U_SEC",
          showIf: { path: "warnings.faint", values: [true] },
        },
        {
          widget: "switch",
          path: "warnings.hurt",
          label: "ADMIN_F_WARN_HURT",
          hint: "ADMIN_H_WARN_HURT",
        },
        {
          widget: "number",
          path: "warnings.damage",
          label: "ADMIN_F_WARN_DAMAGE",
          hint: "ADMIN_H_WARN_DAMAGE",
          min: 1,
          max: 50,
          unit: "ADMIN_U_HP",
          showIf: { path: "warnings.hurt", values: [true] },
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
          showIf: { path: "warnings.hurt", values: [true] },
        },
      ],
    },
  ],
};
