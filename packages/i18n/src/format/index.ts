import type { SupportedLocale } from "../core";

export type FormatDateOptions = Intl.DateTimeFormatOptions;
export type FormatNumberOptions = Intl.NumberFormatOptions;

export const formatDate = (locale: SupportedLocale, value: Date | number | string, options?: FormatDateOptions): string => {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", ...options }).format(date);
};

export const formatDateTime = (locale: SupportedLocale, value: Date | number | string, options?: FormatDateOptions): string => {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", ...options }).format(date);
};

export const formatNumber = (locale: SupportedLocale, value: number, options?: FormatNumberOptions): string => {
  return new Intl.NumberFormat(locale, options).format(value);
};

export const formatCurrency = (
  locale: SupportedLocale,
  value: number,
  currency: string = "NOK",
  options?: Omit<FormatNumberOptions, "style" | "currency">
): string => {
  return new Intl.NumberFormat(locale, { style: "currency", currency, ...options }).format(value);
};

export const formatPercent = (locale: SupportedLocale, value: number, options?: Omit<FormatNumberOptions, "style">): string => {
  return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 2, ...options }).format(value);
};

export const formatList = (locale: SupportedLocale, values: string[], options?: Intl.ListFormatOptions): string => {
  return new Intl.ListFormat(locale, { style: "long", type: "conjunction", ...options }).format(values);
};

export const formatRelativeTime = (
  locale: SupportedLocale,
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  options?: Intl.RelativeTimeFormatOptions
): string => {
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto", ...options }).format(value, unit);
};
