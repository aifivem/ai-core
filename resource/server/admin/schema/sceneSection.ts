import { spec } from "@aicore-fivem/lib/shared";
import { WEATHERS } from "@aicore-fivem/shared";
import type { DataSpec } from "@aicore-fivem/shared";

/** Data spec of the character screen scene (settings section `characterScene`). */
export const sceneSection: DataSpec = {
  type: "object",
  fields: {
    fov: spec.int(20, 90),
    time: {
      type: "object",
      fields: {
        enabled: { type: "bool" },
        hour: spec.int(0, 23),
        minute: spec.int(0, 59),
        weather: { type: "enum", values: [...WEATHERS] },
      },
    },
    spots: {
      type: "list",
      min: 1,
      max: 10,
      of: {
        type: "object",
        fields: {
          ped: { type: "vec4" },
          anim: { type: "text", min: 0, max: 64 },
          clip: { type: "text", min: 0, max: 64 },
          camDistance: spec.num(0.3, 15),
          camHeight: spec.num(-2, 2),
          camAngle: spec.num(-180, 180),
          targetHeight: spec.num(-2, 3),
          sway: spec.num(0, 45),
          blur: { type: "bool" },
          blurNear: spec.num(0, 50),
          blurFar: spec.num(0, 100),
          blurStrength: spec.num(0, 100),
        },
      },
    },
  },
};
