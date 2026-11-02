import { CORE } from "@aifivem/shared";
import { SETUP_WELCOME_EVENT, type SetupWelcome } from "common/setup";
import { local } from "./content";

/** Until the setup guide is finished, every player who spawns is told how to start it (admins open it from there). */
on(CORE.playerLoadedEvent, (source: number) => {
  if (local.value.setupDone) return;
  const fivem = getPlayerIdentifiers(String(source)).find((id) =>
    id.startsWith("fivem:"),
  );
  const welcome: SetupWelcome = {
    admin: Boolean(IsPlayerAceAllowed(String(source), "ai.admin")),
    adminLine: fivem ? `add_principal identifier.${fivem} group.admin` : "",
  };
  emitNet(SETUP_WELCOME_EVENT, source, welcome);
});
