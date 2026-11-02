import {
  BLIP_STYLE_FIELDS,
  PLACE_PED_SPEC,
  placePedFields,
} from "@aifivem/lib/shared";
import type { FileSpec, TabSpec } from "@aifivem/shared";

/** Paycheck offices tab: where players collect the salary the paycheck's office mode keeps (`data/paycheckOffices.json`). */

export const paycheckOfficesFile: FileSpec = {
  kind: "records",
  sync: "all",
  labelPath: "label",
  newRecord: {
    label: "Paycheck office",
    coords: { x: 0, y: 0, z: 0 },
    radius: 2,
    blip: true,
    blipStyle: { sprite: 500, color: 2, scale: 0.7 },
  },
  sections: {
    ped: PLACE_PED_SPEC,
    label: { type: "text", min: 1, max: 48 },
    coords: { type: "vec3" },
    radius: { type: "number", min: 1, max: 20 },
    blip: { type: "bool" },
    blipStyle: { type: "object", optional: true, fields: BLIP_STYLE_FIELDS },
  },
};

export const paycheckOfficesTab: TabSpec = {
  id: "paycheckOffices",
  file: "paycheckOffices",
  icon: "money-bill-wave",
  label: "ADMIN_TAB_PAY_OFFICES",
  desc: "ADMIN_TAB_PAY_OFFICES_DESC",
  createLabel: "ADMIN_NEW_PAY_OFFICE",
  deleteLabel: "ADMIN_DELETE_PAY_OFFICE",
  cards: [
    {
      icon: "money-bill-wave",
      title: "ADMIN_C_PAY_OFFICE",
      desc: "ADMIN_C_PAY_OFFICE_DESC",
      fields: [
        {
          widget: "text",
          path: "label",
          suggest: { from: "coords" },
          label: "ADMIN_F_OFFICE_LABEL",
          placeholder: "ADMIN_P_OFFICE_LABEL",
        },
        {
          widget: "point",
          path: "coords",
          label: "ADMIN_F_OFFICE_COORDS",
          hint: "ADMIN_H_OFFICE_COORDS",
          ground: true,
        },
        {
          widget: "number",
          path: "radius",
          label: "ADMIN_F_OFFICE_RADIUS",
          hint: "ADMIN_H_OFFICE_RADIUS",
          min: 1,
          max: 20,
          unit: "ADMIN_U_METRES",
        },
        { widget: "switch", path: "blip", label: "ADMIN_F_OFFICE_BLIP" },
        {
          widget: "blip",
          path: "blipStyle",
          label: "ADMIN_F_OFFICE_BLIP_STYLE",
          showIf: { path: "blip", values: [true] },
        },
      ],
    },
    {
      icon: "user",
      title: "ADMIN_C_PED",
      desc: "ADMIN_C_PED_DESC",
      fields: placePedFields(),
    },
  ],
};
