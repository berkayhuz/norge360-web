import type { SupportedLocale } from "../core";
import { resolveLocale } from "../core";
import { loadMessages } from "../messages";

export const getMessagesForLocale = async (input: unknown, fallback?: SupportedLocale) => {
  const locale = resolveLocale(input, fallback);
  const messages = await loadMessages(locale);

  return { locale, messages };
};

export const createNextIntlRequestConfig = async (input: unknown, fallback?: SupportedLocale) => {
  return getMessagesForLocale(input, fallback);
};

export type NextIntlRequestConfig = Awaited<ReturnType<typeof createNextIntlRequestConfig>>;
