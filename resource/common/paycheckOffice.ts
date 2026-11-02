import {
  bool,
  type BlipStyle,
  num,
  type PlacePed,
  readBlipStyle,
  readPlacePed,
  record,
  str,
} from "@aifivem/lib/shared";

/**
 * Paycheck offices: the places where players collect the salary the paycheck's office mode keeps (panel records file
 * `paycheckOffices`, `sync: "all"`: the client builds their points). No natives: the web preview imports the schema.
 */
export const PAYCHECK_OFFICE = {
  /** Panel records file. */
  file: "paycheckOffices",
  /** Callback: (office id) -> { ok, balance } the salary waiting (the office menu's snapshot). */
  balanceCallback: "ai-core:paycheckOffice:balance",
  /** Callback: (office id, amount | null = everything) -> { ok } pays waiting salary into the pay account. */
  withdrawCallback: "ai-core:paycheckOffice:withdraw",
} as const;

/** One office: the counter players use, its reach, map blip and clerk. */
export interface PaycheckOffice {
  label: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  blip: boolean;
  blipStyle: BlipStyle;
  /** NPC standing at the office, null for none. */
  ped: PlacePed | null;
}

/** One record of the `paycheckOffices` file (`panel.records` / `world.records`). */
export function readPaycheckOffice(
  id: string,
  v: Record<string, unknown>,
): PaycheckOffice {
  const c = record(v.coords);
  return {
    label: str(v.label, id, 48),
    x: num(c.x, 0),
    y: num(c.y, 0),
    z: num(c.z, 0),
    radius: num(v.radius, 2, 1, 20),
    blip: bool(v.blip, true),
    blipStyle: readBlipStyle(v.blipStyle, {
      sprite: 500,
      color: 2,
      scale: 0.7,
    }),
    ped: readPlacePed(v.ped),
  };
}
