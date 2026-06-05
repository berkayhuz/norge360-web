import type { SupportedLocale } from "../core";
import { FALLBACK_LOCALE, resolveLocale } from "../core";

export const resolveLocaleForTest = (input: unknown, fallback: SupportedLocale = FALLBACK_LOCALE): SupportedLocale => {
  return resolveLocale(input, fallback);
};
