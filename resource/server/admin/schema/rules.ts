import type { TabSpec } from "@aicore-fivem/shared";
import { primeTimeCard } from "./primeTime";

/** Job and gang rules tab: multi-job, multi-gang, paycheck and prime time; `accounts`: the account types at start (pay account). */
export function rulesTab(accounts: string[]): TabSpec {
  const accountOptions = accounts.map((value) => ({ value, label: value }));
  return {
    id: "rules",
    file: "settings",
    icon: "scale-balanced",
    label: "ADMIN_TAB_RULES",
    desc: "ADMIN_TAB_RULES_DESC",
    cards: [
      {
        icon: "briefcase",
        title: "ADMIN_C_JOB_RULES",
        desc: "ADMIN_C_JOB_RULES_DESC",
        fields: [
          {
            widget: "switch",
            path: "jobs.multiJob",
            label: "ADMIN_F_MULTI_JOB",
            hint: "ADMIN_H_MULTI_JOB",
          },
          {
            widget: "number",
            path: "jobs.maxJobs",
            label: "ADMIN_F_MAX_JOBS",
            min: 1,
            max: 20,
          },
          {
            widget: "switch",
            path: "jobs.restoreDuty",
            label: "ADMIN_F_RESTORE_DUTY",
            hint: "ADMIN_H_RESTORE_DUTY",
          },
        ],
      },
      {
        icon: "people-group",
        title: "ADMIN_C_GANG_RULES",
        desc: "ADMIN_C_GANG_RULES_DESC",
        fields: [
          {
            widget: "switch",
            path: "gangs.multiGang",
            label: "ADMIN_F_MULTI_GANG",
          },
          {
            widget: "number",
            path: "gangs.maxGangs",
            label: "ADMIN_F_MAX_GANGS",
            min: 1,
            max: 20,
          },
        ],
      },
      {
        icon: "money-bill-wave",
        title: "ADMIN_C_PAYCHECK",
        desc: "ADMIN_C_PAYCHECK_DESC",
        fields: [
          {
            widget: "number",
            path: "paycheck.intervalMinutes",
            label: "ADMIN_F_PAY_INTERVAL",
            hint: "ADMIN_H_PAY_INTERVAL",
            min: 0,
            max: 1440,
            unit: "ADMIN_U_MINUTES",
          },
          {
            widget: "select",
            path: "paycheck.account",
            label: "ADMIN_F_PAY_ACCOUNT",
            options: accountOptions,
          },
          {
            widget: "switch",
            path: "paycheck.fromJobAccount",
            label: "ADMIN_F_FROM_JOB_ACCOUNT",
            hint: "ADMIN_H_FROM_JOB_ACCOUNT",
          },
        ],
      },
      primeTimeCard,
    ],
  };
}
