import { GlobalKey, stateString } from "@aicore-fivem/lib/server";
import { CORE } from "@aicore-fivem/shared";
import { panel, settings } from "./content";

/** The interaction style every script's lib `Points` follow, replicated to clients. */
const style = new GlobalKey(CORE.interactionStateKey, stateString);
const publish = () => style.set(settings.interaction);
publish();
panel.onChange("settings", publish);
