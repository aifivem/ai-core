import type { CardSpec, DataSpec } from "@aicore-fivem/shared";

/** Settings section `recommendations` (no FiveM code here: the web preview imports the panel schema). */
export const RECOMMENDATIONS_SECTION: DataSpec = {
  type: "object",
  fields: {
    dismissed: {
      type: "names",
      max: 64,
      itemMax: 64,
      pattern: "^[a-z0-9_-]{2,64}$",
    },
  },
};

export const DEFAULT_RECOMMENDATIONS = { dismissed: [] };

/** General tab card: the dismissed recommendations; removing one shows it again. */
export const recommendationsCard: CardSpec = {
  icon: "lightbulb",
  title: "ADMIN_C_RECOMMENDATIONS",
  desc: "ADMIN_C_RECOMMENDATIONS_DESC",
  fields: [
    {
      widget: "tags",
      path: "recommendations.dismissed",
      label: "ADMIN_F_RECOMMENDATIONS_DISMISSED",
      hint: "ADMIN_H_RECOMMENDATIONS_DISMISSED",
      placeholder: "ADMIN_PH_RECOMMENDATIONS_DISMISSED",
    },
  ],
};
