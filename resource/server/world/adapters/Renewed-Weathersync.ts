import type { WeatherAdapter } from "../adapter";
import { qbWeathersync } from "./qb-weathersync";

/**
 * Renewed-Weathersync `provide`s qb-weathersync and cd_easytime: it answers qb-weathersync's exports (its cd_easytime
 * export does not work), so it is picked by its own name, ahead of cd_easytime.
 */
export const renewedWeathersync: WeatherAdapter = {
  ...qbWeathersync,
  resource: "Renewed-Weathersync",
  version: "1.1.8",
};
