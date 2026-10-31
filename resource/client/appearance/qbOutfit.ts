import type { JobOutfit } from "@aicore-fivem/shared";

/** QB job outfit keys (`qb-clothing:client:loadOutfit`'s `outfitData`) per component and prop id. */
const COMPONENT_KEYS: Record<number, string> = {
  1: "mask",
  3: "arms",
  4: "pants",
  5: "bag",
  6: "shoes",
  7: "accessory",
  8: "t-shirt",
  9: "vest",
  10: "decals",
  11: "torso2",
};
const PROP_KEYS: Record<number, string> = { 0: "hat", 1: "glass", 2: "ear" };

/**
 * A job outfit in QB's `{ outfitData = { pants = { item, texture } } }` shape for the local ped: QB scripts address
 * clothes by global drawable index, so each collection piece is turned into the ped's global index. Pieces QB has no
 * key for (face, hair, watches) are left out.
 */
export function qbOutfit(ped: number, outfit: JobOutfit) {
  const outfitData: Record<string, { item: number; texture: number }> = {};
  for (const piece of outfit.components) {
    const key = COMPONENT_KEYS[piece.id];
    if (key)
      outfitData[key] = {
        item: GetPedDrawableGlobalIndexFromCollection(
          ped,
          piece.id,
          piece.collection,
          piece.index,
        ),
        texture: piece.texture,
      };
  }
  for (const piece of outfit.props) {
    const key = PROP_KEYS[piece.id];
    if (key)
      outfitData[key] = {
        item:
          piece.index < 0
            ? -1
            : GetPedPropGlobalIndexFromCollection(
                ped,
                piece.id,
                piece.collection,
                piece.index,
              ),
        texture: piece.texture,
      };
  }
  return { outfitData };
}
