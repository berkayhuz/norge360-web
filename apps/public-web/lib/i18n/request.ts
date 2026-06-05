import { cookies, headers } from "next/headers"
import { DEFAULT_LOCALE, getSupportedLocales, loadMessages, resolveLocale, type Messages, type SupportedLocale } from "@workspace/i18n"

const LOCALE_COOKIE_NAME = "n360_locale"
const LOCALE_HEADER_NAME = "x-n360-locale"

const localeFromAcceptLanguage = (value: string | null): string | null => {
  if (!value) return null

  const tokens = value
    .split(",")
    .map((part) => part.split(";")[0]?.trim())
    .filter(Boolean) as string[]

  for (const token of tokens) {
    const resolved = resolveLocale(token)
    if (resolved) return resolved

    const languageCode = token.split("-")[0]?.toLowerCase()
    if (!languageCode) continue

    const languageLocale = getSupportedLocales().find((locale) => locale.toLowerCase().startsWith(`${languageCode}-`))
    if (languageLocale) return languageLocale
  }

  return null
}

export const resolveRequestLocale = async () => {
  const cookieStore = await cookies()
  const requestHeaders = await headers()

  const candidate =
    cookieStore.get(LOCALE_COOKIE_NAME)?.value ??
    requestHeaders.get(LOCALE_HEADER_NAME) ??
    localeFromAcceptLanguage(requestHeaders.get("accept-language"))

  return resolveLocale(candidate, DEFAULT_LOCALE)
}

export const getRequestI18n = async (): Promise<{ locale: SupportedLocale; messages: Messages }> => {
  const locale = await resolveRequestLocale()
  const messages = await loadMessages(locale)

  return { locale, messages }
}
