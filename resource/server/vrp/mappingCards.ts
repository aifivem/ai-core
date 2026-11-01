import type { CardSpec, WidgetSpec } from "@aicore-fivem/shared";

/** Cards of the vRP tab that map permission strings and group names onto jobs, gangs and admin. No FiveM code here. */

/** A grade picker for the job / gang named in the same row, shown while `who` picks it. */
const gradeRow = (of: "job" | "gang"): WidgetSpec => ({
  widget: "grade",
  path: "grade",
  of,
  lookup: of,
  label: "ADMIN_F_VRP_GRADE",
  hint: "ADMIN_H_VRP_GRADE",
  showIf: { path: "who", values: [of] },
});

const jobRow: WidgetSpec = {
  widget: "text",
  path: "job",
  lookup: "job",
  label: "ADMIN_F_VRP_JOB",
  placeholder: "ADMIN_PH_VRP_JOB",
  showIf: { path: "who", values: ["job"] },
};

const gangRow: WidgetSpec = {
  widget: "text",
  path: "gang",
  lookup: "gang",
  label: "ADMIN_F_VRP_GANG",
  placeholder: "ADMIN_PH_VRP_GANG",
  showIf: { path: "who", values: ["gang"] },
};

/** A new permission rule: admins only until the owner picks who holds it (a rule replaces the defaults). */
export const VRP_NEW_RULE = {
  permission: "",
  who: "admin",
  job: "",
  gang: "",
  group: "",
  grade: 0,
  onDuty: true,
  admin: false,
  everyone: false,
};

export const rulesCard: CardSpec = {
  icon: "key",
  title: "ADMIN_C_VRP_RULES",
  desc: "ADMIN_C_VRP_RULES_DESC",
  fields: [
    {
      widget: "list",
      path: "permissions",
      label: "ADMIN_F_VRP_RULES",
      hint: "ADMIN_H_VRP_RULES",
      addLabel: "ADMIN_ADD_VRP_RULE",
      newRow: VRP_NEW_RULE,
      min: 0,
      max: 1000,
      search: true,
      wrap: true,
      rows: [
        {
          widget: "text",
          path: "permission",
          label: "ADMIN_F_VRP_PERMISSION",
          placeholder: "ADMIN_PH_VRP_PERMISSION",
        },
        {
          widget: "select",
          path: "who",
          label: "ADMIN_F_VRP_WHO",
          options: [
            { value: "job", label: "ADMIN_O_VRP_JOB" },
            { value: "gang", label: "ADMIN_O_VRP_GANG" },
            { value: "group", label: "ADMIN_O_VRP_GROUP" },
            { value: "admin", label: "ADMIN_O_VRP_ADMIN" },
            { value: "everyone", label: "ADMIN_O_VRP_EVERYONE" },
          ],
        },
        jobRow,
        gradeRow("job"),
        {
          widget: "switch",
          path: "onDuty",
          label: "ADMIN_F_VRP_ON_DUTY",
          showIf: { path: "who", values: ["job"] },
        },
        gangRow,
        gradeRow("gang"),
        {
          widget: "text",
          path: "group",
          label: "ADMIN_F_VRP_GROUP",
          placeholder: "ADMIN_PH_VRP_GROUP",
          showIf: { path: "who", values: ["group"] },
        },
      ],
    },
  ],
};

export const groupsCard: CardSpec = {
  icon: "users",
  title: "ADMIN_C_VRP_GROUPS",
  desc: "ADMIN_C_VRP_GROUPS_DESC",
  fields: [
    {
      widget: "list",
      path: "groups",
      label: "ADMIN_F_VRP_GROUPS",
      hint: "ADMIN_H_VRP_GROUPS",
      addLabel: "ADMIN_ADD_VRP_GROUP",
      newRow: {
        group: "",
        who: "job",
        job: "",
        gang: "",
        grade: 0,
        admin: false,
      },
      min: 0,
      max: 500,
      search: true,
      wrap: true,
      rows: [
        {
          widget: "text",
          path: "group",
          label: "ADMIN_F_VRP_GROUP_NAME",
          placeholder: "ADMIN_PH_VRP_GROUP_NAME",
        },
        {
          widget: "select",
          path: "who",
          label: "ADMIN_F_VRP_MEANS",
          options: [
            { value: "job", label: "ADMIN_O_VRP_JOB_GRADE" },
            { value: "gang", label: "ADMIN_O_VRP_GANG_GRADE" },
            { value: "admin", label: "ADMIN_O_VRP_ADMIN" },
          ],
        },
        jobRow,
        gradeRow("job"),
        gangRow,
        gradeRow("gang"),
      ],
    },
  ],
};
