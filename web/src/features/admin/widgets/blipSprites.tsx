import { memo } from "react";
import blips from "../blips.json";

export interface Sprite {
  id: number;
  name: string;
  ext: string;
}
export interface Color {
  id: number;
  hex: string;
  name: string;
}
// The FiveM blip reference (docs.fivem.net/docs/game-references/blips): sprite pictures and blip colours.
export const SPRITES: Sprite[] = blips.sprites.filter(
  (s) => s.name !== "radar_empty",
);
export const COLORS: Color[] = blips.colors;
export const COLS = 8;
export const url = (s: Sprite) => `${blips.base}${s.name}.${s.ext}`;
export const label = (s: Sprite) =>
  s.name.replace(/^radar_/, "").replace(/_/g, " ");

export const Icon = memo(function Icon({
  sprite,
  size,
}: {
  sprite: number;
  size: string;
}) {
  const s = blips.sprites.find((x) => x.id === sprite);
  if (!s)
    return (
      <span
        style={{ width: size, height: size }}
        className="rounded-full bg-white/10"
      />
    );
  // A few sprites have no picture in the reference: the cell stays empty instead of a broken image.
  return (
    <img
      src={url(s)}
      alt=""
      draggable={false}
      loading="lazy"
      onError={(e) => (e.currentTarget.style.visibility = "hidden")}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
});
