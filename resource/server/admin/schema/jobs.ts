import type { FileSpec, TabSpec } from "@aicore-fivem/shared";
import { DEFAULT_PRIME_TIME } from "../../content/primeTime";
import { jobPrimeCard } from "./primeTime";
import { bool, gradeRows, grades, ID, optionalHour, text } from "./specs";

/** Jobs and gangs: their records files (`data/jobs.json`, `data/gangs.json`) and tabs. */

export const jobsFile: FileSpec = {
  kind: "records",
  sync: "all",
  labelPath: "label",
  locked: ["unemployed"],
  newRecord: {
    type: "none",
    defaultDuty: false,
    listed: false,
    grades: [{ label: "Member", salary: 0 }],
    primeOwn: false,
    primeStart: DEFAULT_PRIME_TIME.start,
    primeFinish: DEFAULT_PRIME_TIME.finish,
  },
  sections: {
    label: text(48),
    type: { type: "text", max: 32, pattern: ID },
    defaultDuty: bool,
    listed: { type: "bool", optional: true },
    grades,
    primeOwn: { type: "bool", optional: true },
    primeStart: optionalHour,
    primeFinish: optionalHour,
  },
};

export const gangsFile: FileSpec = {
  kind: "records",
  sync: "all",
  labelPath: "label",
  newRecord: { grades: [{ label: "Member", salary: 0 }] },
  sections: { label: text(48), grades },
};

export const jobsTab: TabSpec = {
  id: "jobs",
  file: "jobs",
  icon: "briefcase",
  label: "ADMIN_TAB_JOBS",
  desc: "ADMIN_TAB_JOBS_DESC",
  listSub: "type",
  createLabel: "ADMIN_NEW_JOB",
  deleteLabel: "ADMIN_DELETE_JOB",
  cards: [
    {
      icon: "id-card",
      title: "ADMIN_C_JOB",
      fields: [
        {
          widget: "text",
          path: "label",
          label: "ADMIN_F_NAME",
          placeholder: "ADMIN_PH_JOB",
        },
        {
          widget: "text",
          path: "type",
          label: "ADMIN_F_JOB_TYPE",
          hint: "ADMIN_H_JOB_TYPE",
          placeholder: "ADMIN_PH_JOB_TYPE",
        },
        {
          widget: "switch",
          path: "defaultDuty",
          label: "ADMIN_F_DEFAULT_DUTY",
          hint: "ADMIN_H_DEFAULT_DUTY",
        },
        {
          widget: "switch",
          path: "listed",
          label: "ADMIN_F_JOB_LISTED",
          hint: "ADMIN_H_JOB_LISTED",
        },
      ],
    },
    {
      icon: "ranking-star",
      title: "ADMIN_C_GRADES",
      desc: "ADMIN_C_GRADES_DESC",
      fields: [
        {
          widget: "list",
          path: "grades",
          label: "",
          rows: gradeRows(true),
          newRow: { label: "Grade", salary: 0, offPrimePayment: 0 },
          addLabel: "ADMIN_ADD_GRADE",
          rowLabel: "ADMIN_ROW_GRADE",
          max: 30,
        },
      ],
    },
    jobPrimeCard,
  ],
};

export const gangsTab: TabSpec = {
  id: "gangs",
  file: "gangs",
  icon: "people-group",
  label: "ADMIN_TAB_GANGS",
  desc: "ADMIN_TAB_GANGS_DESC",
  createLabel: "ADMIN_NEW_GANG",
  deleteLabel: "ADMIN_DELETE_GANG",
  cards: [
    {
      icon: "id-card",
      title: "ADMIN_C_GANG",
      fields: [
        {
          widget: "text",
          path: "label",
          label: "ADMIN_F_NAME",
          placeholder: "ADMIN_PH_GANG",
        },
      ],
    },
    {
      icon: "ranking-star",
      title: "ADMIN_C_GRADES",
      desc: "ADMIN_C_GANG_GRADES_DESC",
      fields: [
        {
          widget: "list",
          path: "grades",
          label: "",
          rows: gradeRows(false),
          newRow: { label: "Grade", salary: 0 },
          addLabel: "ADMIN_ADD_GRADE",
          rowLabel: "ADMIN_ROW_GRADE",
          max: 30,
        },
      ],
    },
  ],
};
