import type { SupportedLocale } from "../core";
import { FALLBACK_LOCALE } from "../core";
import { MESSAGE_NAMESPACES, type MessageNamespace, type Messages } from "./types";

type NamespaceMessages = Record<string, unknown>;

type NamespaceImporter = () => Promise<NamespaceMessages>;

type LocaleImporterMap = Readonly<Record<MessageNamespace, NamespaceImporter>>;

const IMPORTERS: Readonly<Record<SupportedLocale, LocaleImporterMap>> = {
  "nb-NO": {
    actions: () => import("../../messages/nb-NO/actions.json").then((m) => m.default),
    auth: () => import("../../messages/nb-NO/auth.json").then((m) => m.default),
    common: () => import("../../messages/nb-NO/common.json").then((m) => m.default),
    "data-table": () => import("../../messages/nb-NO/data-table.json").then((m) => m.default),
    navigation: () => import("../../messages/nb-NO/navigation.json").then((m) => m.default),
    "public-web": () => import("../../messages/nb-NO/public-web.json").then((m) => m.default),
    validation: () => import("../../messages/nb-NO/validation.json").then((m) => m.default)
  },
  "en-US": {
    actions: () => import("../../messages/en-US/actions.json").then((m) => m.default),
    auth: () => import("../../messages/en-US/auth.json").then((m) => m.default),
    common: () => import("../../messages/en-US/common.json").then((m) => m.default),
    "data-table": () => import("../../messages/en-US/data-table.json").then((m) => m.default),
    navigation: () => import("../../messages/en-US/navigation.json").then((m) => m.default),
    "public-web": () => import("../../messages/en-US/public-web.json").then((m) => m.default),
    validation: () => import("../../messages/en-US/validation.json").then((m) => m.default)
  },
  "sv-SE": {
    actions: () => import("../../messages/sv-SE/actions.json").then((m) => m.default),
    auth: () => import("../../messages/sv-SE/auth.json").then((m) => m.default),
    common: () => import("../../messages/sv-SE/common.json").then((m) => m.default),
    "data-table": () => import("../../messages/sv-SE/data-table.json").then((m) => m.default),
    navigation: () => import("../../messages/sv-SE/navigation.json").then((m) => m.default),
    "public-web": () => import("../../messages/sv-SE/public-web.json").then((m) => m.default),
    validation: () => import("../../messages/sv-SE/validation.json").then((m) => m.default)
  },
  "da-DK": {
    actions: () => import("../../messages/da-DK/actions.json").then((m) => m.default),
    auth: () => import("../../messages/da-DK/auth.json").then((m) => m.default),
    common: () => import("../../messages/da-DK/common.json").then((m) => m.default),
    "data-table": () => import("../../messages/da-DK/data-table.json").then((m) => m.default),
    navigation: () => import("../../messages/da-DK/navigation.json").then((m) => m.default),
    "public-web": () => import("../../messages/da-DK/public-web.json").then((m) => m.default),
    validation: () => import("../../messages/da-DK/validation.json").then((m) => m.default)
  },
  "de-DE": {
    actions: () => import("../../messages/de-DE/actions.json").then((m) => m.default),
    auth: () => import("../../messages/de-DE/auth.json").then((m) => m.default),
    common: () => import("../../messages/de-DE/common.json").then((m) => m.default),
    "data-table": () => import("../../messages/de-DE/data-table.json").then((m) => m.default),
    navigation: () => import("../../messages/de-DE/navigation.json").then((m) => m.default),
    "public-web": () => import("../../messages/de-DE/public-web.json").then((m) => m.default),
    validation: () => import("../../messages/de-DE/validation.json").then((m) => m.default)
  }
};

export const loadMessages = async (locale: SupportedLocale): Promise<Messages> => {
  const localeImporters = IMPORTERS[locale];

  const pairs = await Promise.all(
    MESSAGE_NAMESPACES.map(async (namespace: MessageNamespace) => [namespace, await localeImporters[namespace]()] as const)
  );

  return Object.fromEntries(pairs) as Messages;
};

export const loadMessagesWithFallback = async (locale: SupportedLocale): Promise<Messages> => {
  try {
    return await loadMessages(locale);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      throw error;
    }
    return loadMessages(FALLBACK_LOCALE);
  }
};
