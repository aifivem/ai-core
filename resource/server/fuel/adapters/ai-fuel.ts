import { bagFuel } from "./bag";

/** ai-fuel: its server keeps the `fuel` bag (0-100); its driver client burns from it and reports lower values. */
export const aiFuel = bagFuel("ai-fuel");
