/** Browser preview only: `?view=prompt` shows two prompts (the top one is the active one). */
export function mockPrompts(): unknown {
  if (new URLSearchParams(window.location.search).get("view") !== "prompt")
    return undefined;
  return [
    { key: "ai-garage:park", text: "Park the vehicle", button: "G" },
    {
      key: "ai-appearance:clothing_4",
      text: "Browse the clothing store",
      button: "E",
    },
  ];
}
