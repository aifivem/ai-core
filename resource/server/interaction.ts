import { CORE } from "@aicore-fivem/shared";
import { panel, settings } from "./content";

/** The interaction style every script's lib `Points` follow, replicated to clients. */
const publish = () => GlobalState.set(CORE.interactionStateKey, settings.interaction, true);
publish();
panel.onChange("settings", publish);
