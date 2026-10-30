/** NUI contract of ai-core (client script <-> web), shared by both sides. */

/** Client -> NUI messages: `{ action, data }`. */
export const NuiMessage = {
  /** data: { screen: CharacterScreen, texts, portraits, scene: boolean } (scene: the world scene stands behind the screen). */
  openCharacters: "openCharacters",
  closeCharacters: "closeCharacters",
  /** A character was picked: the screen fades out (then `closeCharacters`). */
  leaveCharacters: "leaveCharacters",
  /** data: { id: number, url: string }, a character's portrait arrived (from an appearance resource). */
  portrait: "portrait",
  /** data: { panels: AdminPanelSnapshot[], texts }, the admin panel opens. */
  adminOpen: "adminOpen",
  /** data: AdminDelta, a record changed (by any admin or the script itself). */
  adminDelta: "adminDelta",
  /** data: RecommendationDelta, a script recommendation starts or stops showing on the dashboard. */
  adminRecommendation: "adminRecommendation",
  /** data: PlayersDelta (`adminPlayers.ts`), a change on the open Players screen. */
  adminPlayers: "adminPlayers",
  /** data: { key, text, button }, a prompt appears (or its text changes) on the right. */
  promptShow: "promptShow",
  /** data: key */
  promptHide: "promptHide",
  /** data: Notification */
  notify: "notify",
  /** data: { label, duration }, the progress bar starts. */
  progressShow: "progressShow",
  progressHide: "progressHide",
  /** data: MenuRequest */
  menuOpen: "menuOpen",
  /** data: InputRequest */
  inputOpen: "inputOpen",
  /** data: { binds: KeyboardBind[], texts }, the keys screen opens. */
  keyboardOpen: "keyboardOpen",
  keyboardClose: "keyboardClose",
  /** data: { title, items: PickerItem[] } */
  itemsOpen: "itemsOpen",
  dialogClose: "dialogClose",
  /** data: SetupWelcome & { texts }, the setup guide is not finished: the welcome card shows. */
  setupWelcome: "setupWelcome",
} as const;

/** NUI -> client callbacks (fetch `https://ai-core/<name>`), each answers `{ ok, error? }` or data. */
export const NuiCallback = {
  /** () -> open payload | null, the screen asks for its data once it is mounted. */
  ready: "ready",
  /** (CreateCharacterInput) -> CharacterActionResult */
  create: "create",
  /** (characterId) -> CharacterActionResult */
  select: "select",
  /** (characterId) -> true, the picked card changed: the scene camera moves to that character. */
  focus: "focus",
  /** (characterId) -> CharacterActionResult, then the screen is reloaded. */
  remove: "remove",
  /** ({ resource, patch }) -> AdminResult */
  adminApply: "adminApply",
  /** () -> true, the panel closed. */
  adminClose: "adminClose",
  /** ({ action: PlayersAction, args }) -> the server callback's answer (snapshot, page or PlayersResult). */
  adminPlayers: "adminPlayers",
  /** ({ from: "ped" | "camera", ground?: boolean }) -> { x, y, z, heading }, the admin's position for a point field. */
  adminPosition: "adminPosition",
  /** ({ x, y, z, heading? }) -> true, teleports the admin to a point. */
  adminTeleport: "adminTeleport",
  /** (data: { root: boolean }) -> point | null: picks a place with the free camera (the panel hides meanwhile). */
  adminPickPoint: "adminPickPoint",
  /** () -> { model, x, y, z } | null: a world object picked with the free camera. */
  adminPickEntity: "adminPickEntity",
  /** (data: { x, y, z } | null) -> string[]: street and zone names at the place (or at the admin) for name suggestions. */
  adminPlaceNames: "adminPlaceNames",
  /** (data: { points: {x,y,z}[], height } | null) -> true: draws a zone widget's polygon in the world (null stops). */
  adminZoneDraw: "adminZoneDraw",
  /** (data: { command }) -> true: closes ai-core's panel and runs another script's panel command. */
  adminRunCommand: "adminRunCommand",
  /** ({ value }) -> true, the menu pick (item id) or input values; null when closed. */
  dialogAnswer: "dialogAnswer",
  /** ({ id }) -> true, the pointer or focus moved onto a menu item. */
  dialogHover: "dialogHover",
  /** ({ id, checked }) -> true, a switch row of the menu was flipped (the menu stays open). */
  dialogToggle: "dialogToggle",
  /** () -> true, the keys screen closed. */
  keyboardClose: "keyboardClose",
  /** ({ openPanel: boolean }) -> true, the welcome card closed (an admin may open the panel from it). */
  setupWelcomeClose: "setupWelcomeClose",
} as const;

/** One keybind as the keys screen lists it (the key as the player has it bound now). */
export interface KeyboardBind {
  name: string;
  key: string;
  label: string;
  resource: string;
  mouse: boolean;
}
