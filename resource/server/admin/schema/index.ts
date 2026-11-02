import type { PanelSchema } from "@aifivem/shared";
import { VRP_FILE } from "../../vrp/schema";
import { VRP_TAB } from "../../vrp/tab";
import { NEEDS_FILE, NEEDS_TAB } from "../../needs/schema";
import { accountsFile, accountsTab } from "./accounts";
import { commandsFile, commandsTab } from "./commands";
import { externalPanelsFile, externalTab } from "./external";
import { generalTab } from "./general";
import { gangsFile, gangsTab, jobsFile, jobsTab } from "./jobs";
import { keybindsFile, keybindsTab } from "./keybinds";
import { localFile, localTab } from "./local";
import { paycheckOfficesFile, paycheckOfficesTab } from "./paycheckOffices";
import { rulesTab } from "./rules";
import { sceneTab } from "./scene";
import type { ServiceChoices } from "./services";
import { settingsFile } from "./settings";
import { spawnTab } from "./spawn";

/** ai-core's own panel: server settings, spawn points, character screen scene, job rules, paycheck offices, hunger and thirst, jobs, gangs and money accounts (`data/*.json`). */

/** `accounts`: the account types at start, offered where an account is picked; `inventories` / `keySystems` / `alertSystems`: the adapters. */
export function coreSchema(
  accounts: string[],
  inventories: string[] = [],
  keySystems: string[] = [],
  alertSystems: string[] = [],
  clothingSystems: string[] = [],
  fuelSystems: string[] = [],
  doorSystems: string[] = [],
  garageSystems: string[] = [],
  services: ServiceChoices = {},
): PanelSchema {
  const choices = {
    inventories,
    keySystems,
    alertSystems,
    clothingSystems,
    fuelSystems,
    doorSystems,
    garageSystems,
    services,
  };
  return {
    title: "ADMIN_CORE_TITLE",
    icon: "server",
    files: {
      settings: settingsFile(choices),
      local: localFile,
      jobs: jobsFile,
      gangs: gangsFile,
      accounts: accountsFile(accounts),
      paycheckOffices: paycheckOfficesFile,
      keybinds: keybindsFile,
      commands: commandsFile,
      externalPanels: externalPanelsFile,
      vrp: VRP_FILE,
      needs: NEEDS_FILE,
    },
    tabs: [
      generalTab(choices),
      spawnTab,
      sceneTab,
      rulesTab(accounts),
      paycheckOfficesTab,
      NEEDS_TAB,
      jobsTab,
      gangsTab,
      accountsTab,
      externalTab,
      keybindsTab,
      commandsTab,
      VRP_TAB,
      localTab,
    ],
  };
}
