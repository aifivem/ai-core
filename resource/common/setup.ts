/** Server -> player: (SetupWelcome) the setup guide is not finished; shown once after spawning. */
export const SETUP_WELCOME_EVENT = "ai-core:client:setupWelcome";

export interface SetupWelcome {
  /** The player may open the admin panel. */
  admin: boolean;
  /** The permission.cfg line that makes this player an admin (their FiveM id), or "" without one. */
  adminLine: string;
}
