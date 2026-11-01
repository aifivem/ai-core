import type { CardSpec } from "@aicore-fivem/shared";
import { NOTIFY_SYSTEMS } from "../../notify/registry";
import { servicesCards, type ServiceChoices } from "./services";

/** The adapter names of every integration layer the panel offers (`auto` comes first in each select). */
export interface LayerChoices {
  inventories: string[];
  keySystems: string[];
  alertSystems: string[];
  clothingSystems: string[];
  fuelSystems: string[];
  doorSystems: string[];
  garageSystems: string[];
  services: ServiceChoices;
}

/** General tab cards that pick the script of each integration layer. */
export function layerCards({
  inventories,
  keySystems,
  alertSystems,
  clothingSystems,
  fuelSystems,
  doorSystems,
  garageSystems,
  services,
}: LayerChoices): CardSpec[] {
  return [
    {
      icon: "box-open",
      title: "ADMIN_C_INVENTORY",
      desc: "ADMIN_C_INVENTORY_DESC",
      fields: [
        {
          widget: "select",
          path: "inventory",
          label: "ADMIN_F_INVENTORY",
          hint: "ADMIN_H_INVENTORY",
          options: [
            { value: "auto", label: "ADMIN_O_INVENTORY_AUTO" },
            ...inventories.map((value) => ({ value, label: value })),
          ],
        },
      ],
    },
    {
      icon: "key",
      title: "ADMIN_C_VEHICLE_KEYS",
      desc: "ADMIN_C_VEHICLE_KEYS_DESC",
      fields: [
        {
          widget: "select",
          path: "vehicleKeys",
          label: "ADMIN_F_VEHICLE_KEYS",
          hint: "ADMIN_H_VEHICLE_KEYS",
          options: [
            { value: "auto", label: "ADMIN_O_INVENTORY_AUTO" },
            ...keySystems.map((value) => ({ value, label: value })),
          ],
        },
      ],
    },
    {
      icon: "triangle-exclamation",
      title: "ADMIN_C_DISPATCH",
      desc: "ADMIN_C_DISPATCH_DESC",
      fields: [
        {
          widget: "select",
          path: "dispatch",
          label: "ADMIN_F_DISPATCH",
          hint: "ADMIN_H_DISPATCH",
          options: [
            { value: "auto", label: "ADMIN_O_INVENTORY_AUTO" },
            ...alertSystems.map((value) => ({ value, label: value })),
          ],
        },
      ],
    },
    {
      icon: "shirt",
      title: "ADMIN_C_APPEARANCE",
      desc: "ADMIN_C_APPEARANCE_DESC",
      fields: [
        {
          widget: "select",
          path: "appearance",
          label: "ADMIN_F_APPEARANCE",
          hint: "ADMIN_H_APPEARANCE",
          options: [
            { value: "auto", label: "ADMIN_O_INVENTORY_AUTO" },
            ...clothingSystems.map((value) => ({ value, label: value })),
          ],
        },
      ],
    },
    ...servicesCards(services),
    {
      icon: "gas-pump",
      title: "ADMIN_C_FUEL",
      desc: "ADMIN_C_FUEL_DESC",
      fields: [
        {
          widget: "select",
          path: "fuel",
          label: "ADMIN_F_FUEL",
          hint: "ADMIN_H_FUEL",
          options: [
            { value: "auto", label: "ADMIN_O_INVENTORY_AUTO" },
            ...fuelSystems.map((value) => ({ value, label: value })),
          ],
        },
      ],
    },
    {
      icon: "door-closed",
      title: "ADMIN_C_DOORLOCK",
      desc: "ADMIN_C_DOORLOCK_DESC",
      fields: [
        {
          widget: "select",
          path: "doorlock",
          label: "ADMIN_F_DOORLOCK",
          hint: "ADMIN_H_DOORLOCK",
          options: [
            { value: "auto", label: "ADMIN_O_INVENTORY_AUTO" },
            ...doorSystems.map((value) => ({ value, label: value })),
          ],
        },
      ],
    },
    {
      icon: "warehouse",
      title: "ADMIN_C_GARAGES",
      desc: "ADMIN_C_GARAGES_DESC",
      fields: [
        {
          widget: "select",
          path: "garages",
          label: "ADMIN_F_GARAGES",
          hint: "ADMIN_H_GARAGES",
          options: [
            { value: "auto", label: "ADMIN_O_INVENTORY_AUTO" },
            ...garageSystems.map((value) => ({ value, label: value })),
          ],
        },
      ],
    },
    {
      icon: "bell",
      title: "ADMIN_C_NOTIFY",
      desc: "ADMIN_C_NOTIFY_DESC",
      fields: [
        {
          widget: "select",
          path: "notify",
          label: "ADMIN_F_NOTIFY",
          hint: "ADMIN_H_NOTIFY",
          options: NOTIFY_SYSTEMS.map(({ resource }) => ({
            value: resource,
            label: resource,
          })),
        },
      ],
    },
  ];
}
