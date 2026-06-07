export type LocaleDirection = "ltr";

export const SUPPORTED_LOCALES = ["nb-NO", "en-US", "sv-SE", "da-DK", "de-DE"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "nb-NO";
export const FALLBACK_LOCALE: SupportedLocale = "en-US";

export interface LocaleMetadata {
  locale: SupportedLocale;
  label: string;
  nativeLabel: string;
  language: string;
  region: string;
  direction: LocaleDirection;
}

const SUPPORTED_LOCALE_SET = new Set<string>(SUPPORTED_LOCALES);

const LOCALE_METADATA: Readonly<Record<SupportedLocale, LocaleMetadata>> = {
  "nb-NO": {
    locale: "nb-NO",
    label: "Norwegian Bokmal",
    nativeLabel: "Norsk bokmal",
    language: "Norwegian Bokmal",
    region: "Norway",
    direction: "ltr"
  },
  "en-US": {
    locale: "en-US",
    label: "English (US)",
    nativeLabel: "English (US)",
    language: "English",
    region: "United States",
    direction: "ltr"
  },
  "sv-SE": {
    locale: "sv-SE",
    label: "Swedish",
    nativeLabel: "Svenska",
    language: "Swedish",
    region: "Sweden",
    direction: "ltr"
  },
  "da-DK": {
    locale: "da-DK",
    label: "Danish",
    nativeLabel: "Dansk",
    language: "Danish",
    region: "Denmark",
    direction: "ltr"
  },
  "de-DE": {
    locale: "de-DE",
    label: "German",
    nativeLabel: "Deutsch",
    language: "German",
    region: "Germany",
    direction: "ltr"
  }
} as const;

const normalizeCandidate = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const [language, region] = trimmed.split("-");
  if (!language || !region) return trimmed;
  return `${language.toLowerCase()}-${region.toUpperCase()}`;
};

export const normalizeLocale = (value: string): SupportedLocale | null => {
  const normalized = normalizeCandidate(value);
  return SUPPORTED_LOCALE_SET.has(normalized) ? (normalized as SupportedLocale) : null;
};

export const isSupportedLocale = (value: unknown): value is SupportedLocale => {
  return typeof value === "string" && normalizeLocale(value) !== null;
};

export const assertSupportedLocale = (value: unknown): asserts value is SupportedLocale => {
  if (!isSupportedLocale(value)) {
    throw new Error(`unsupported_locale_${String(value)}`);
  }
};

export const resolveLocale = (input: unknown, fallback: SupportedLocale = DEFAULT_LOCALE): SupportedLocale => {
  if (typeof input !== "string") {
    return fallback;
  }

  return normalizeLocale(input) ?? fallback;
};

export const getLocaleMetadata = (locale: SupportedLocale): LocaleMetadata => LOCALE_METADATA[locale];

export const getSupportedLocales = (): readonly SupportedLocale[] => SUPPORTED_LOCALES;
export const getDefaultLocale = (): SupportedLocale => DEFAULT_LOCALE;
export const getFallbackLocale = (): SupportedLocale => FALLBACK_LOCALE;
