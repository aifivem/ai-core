import type { DataSpec, TabSpec, WidgetSpec } from "@aicore-fivem/shared";
import { WEATHERS } from "@aicore-fivem/shared";
import { DEFAULT_SCENE } from "../content/scene";

/** Panel part of the character screen scene (settings section `characterScene`). */

const num = (min: number, max: number): DataSpec => ({
  type: "number",
  min,
  max,
});
const int = (min: number, max: number): DataSpec => ({
  type: "number",
  min,
  max,
  integer: true,
});

export const sceneSection: DataSpec = {
  type: "object",
  fields: {
    fov: int(20, 90),
    time: {
      type: "object",
      fields: {
        enabled: { type: "bool" },
        hour: int(0, 23),
        minute: int(0, 59),
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
          camDistance: num(0.3, 15),
          camHeight: num(-2, 2),
          camAngle: num(-180, 180),
          targetHeight: num(-2, 3),
          sway: num(0, 45),
          blur: { type: "bool" },
          blurNear: num(0, 50),
          blurFar: num(0, 100),
          blurStrength: num(0, 100),
        },
      },
    },
  },
};

/** The spots are one list shown in three cards (place, camera, blur); each card edits its own fields of the same rows. */
const spots = (rows: WidgetSpec[]): WidgetSpec => ({
  widget: "list",
  path: "characterScene.spots",
  label: "",
  rows,
  newRow: { ...DEFAULT_SCENE.spots[0]! },
  addLabel: "ADMIN_ADD_SPOT",
  rowLabel: "ADMIN_ROW_SPOT",
  max: 10,
});

export const sceneTab: TabSpec = {
  id: "scene",
  file: "settings",
  icon: "users",
  label: "ADMIN_TAB_SCENE",
  desc: "ADMIN_TAB_SCENE_DESC",
  cards: [
    {
      icon: "sliders",
      title: "ADMIN_C_SCENE_LOOK",
      desc: "ADMIN_C_SCENE_LOOK_DESC",
      fields: [
        {
          widget: "number",
          path: "characterScene.fov",
          label: "ADMIN_F_FOV",
          hint: "ADMIN_H_FOV",
          min: 20,
          max: 90,
          unit: "ADMIN_U_DEGREES",
        },
        {
          widget: "switch",
          path: "characterScene.time.enabled",
          label: "ADMIN_F_SCENE_TIME",
          hint: "ADMIN_H_SCENE_TIME",
        },
        {
          widget: "number",
          path: "characterScene.time.hour",
          label: "ADMIN_F_HOUR",
          min: 0,
          max: 23,
        },
        {
          widget: "number",
          path: "characterScene.time.minute",
          label: "ADMIN_F_MINUTE",
          min: 0,
          max: 59,
        },
        {
          widget: "select",
          path: "characterScene.time.weather",
          label: "ADMIN_F_WEATHER",
          options: WEATHERS.map((value) => ({ value, label: value })),
        },
      ],
    },
    {
      icon: "users",
      title: "ADMIN_C_SCENE_SPOTS",
      desc: "ADMIN_C_SCENE_SPOTS_DESC",
      fields: [
        spots([
          {
            widget: "point",
            path: "ped",
            label: "ADMIN_F_SPOT_PED",
            heading: true,
          },
          {
            widget: "text",
            path: "anim",
            label: "ADMIN_F_ANIM_DICT",
            placeholder: "ADMIN_PH_ANIM_DICT",
          },
          {
            widget: "text",
            path: "clip",
            label: "ADMIN_F_ANIM_CLIP",
            placeholder: "ADMIN_PH_ANIM_CLIP",
          },
        ]),
      ],
    },
    {
      icon: "camera",
      title: "ADMIN_C_SCENE_CAMERAS",
      desc: "ADMIN_C_SCENE_CAMERAS_DESC",
      fields: [
        spots([
          {
            widget: "number",
            path: "camDistance",
            label: "ADMIN_F_CAM_DISTANCE",
            min: 0.3,
            max: 15,
            step: 0.05,
            unit: "ADMIN_U_METRES",
          },
          {
            widget: "number",
            path: "camHeight",
            label: "ADMIN_F_CAM_HEIGHT",
            hint: "ADMIN_H_CAM_HEIGHT",
            min: -2,
            max: 2,
            step: 0.05,
          },
          {
            widget: "number",
            path: "camAngle",
            label: "ADMIN_F_CAM_ANGLE",
            hint: "ADMIN_H_CAM_ANGLE",
            min: -180,
            max: 180,
            step: 5,
            unit: "ADMIN_U_DEGREES",
          },
          {
            widget: "number",
            path: "targetHeight",
            label: "ADMIN_F_TARGET_HEIGHT",
            min: -2,
            max: 3,
            step: 0.05,
            unit: "ADMIN_U_METRES",
          },
          {
            widget: "number",
            path: "sway",
            label: "ADMIN_F_SWAY",
            hint: "ADMIN_H_SWAY",
            min: 0,
            max: 45,
            unit: "ADMIN_U_DEGREES",
          },
        ]),
      ],
    },
    {
      icon: "eye",
      title: "ADMIN_C_SCENE_BLUR",
      desc: "ADMIN_C_SCENE_BLUR_DESC",
      fields: [
        spots([
          {
            widget: "switch",
            path: "blur",
            label: "ADMIN_F_BLUR",
            hint: "ADMIN_H_BLUR",
          },
          {
            widget: "number",
            path: "blurNear",
            label: "ADMIN_F_BLUR_NEAR",
            min: 0,
            max: 50,
            step: 0.1,
            unit: "ADMIN_U_METRES",
          },
          {
            widget: "number",
            path: "blurFar",
            label: "ADMIN_F_BLUR_FAR",
            min: 0,
            max: 100,
            step: 0.1,
            unit: "ADMIN_U_METRES",
          },
          {
            widget: "number",
            path: "blurStrength",
            label: "ADMIN_F_BLUR_STRENGTH",
            min: 0,
            max: 100,
            step: 5,
            unit: "%",
          },
        ]),
      ],
    },
  ],
};
